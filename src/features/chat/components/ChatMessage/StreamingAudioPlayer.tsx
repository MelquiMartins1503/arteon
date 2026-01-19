import { Loader2, Pause, Play, Volume2 } from "lucide-react";
import { useParams } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import logger from "@/lib/logger";

interface StreamingAudioPlayerProps {
  messageId: number;
  contentLength: number; // Para estimar duração
  onCached?: (audioUrl: string) => void; // Callback quando áudio é cached
}

type PlayerState =
  | "idle"
  | "connecting"
  | "buffering"
  | "playing"
  | "paused"
  | "error"
  | "complete";

/**
 * Player de áudio com suporte a streaming via Server-Sent Events
 *
 * Funcionalidade:
 * - Conecta em SSE endpoint (/audio-stream)
 * - Processa chunks de áudio conforme chegam
 * - Mantém queue de AudioBuffers para reprodução suave
 * - Começa a tocar após buffer inicial (2-3 chunks)
 * - Mostra progresso estimado baseado em tamanho do texto
 */
const StreamingAudioPlayerComponent = ({
  messageId,
  contentLength,
  onCached,
}: StreamingAudioPlayerProps) => {
  const params = useParams();
  const [state, setState] = useState<PlayerState>("idle");
  const [progress, setProgress] = useState(0); // 0 to 1
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [_currentTime, setCurrentTime] = useState(0);

  // Refs para Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const nextStartTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const accumulatedDurationRef = useRef(0);

  // Estimar duração baseado em caracteres
  // Aproximação: ~150 palavras/minuto, ~5 caracteres/palavra
  // = ~750 caracteres/minuto = ~12.5 caracteres/segundo
  useEffect(() => {
    const estimated = contentLength / 12.5; // segundos
    setEstimatedDuration(estimated);
  }, [contentLength]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      audioQueueRef.current = [];
      isPlayingRef.current = false;
    };
  }, []);

  const cleanup = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  /**
   * Converte base64 PCM → AudioBuffer
   *
   * Gemini retorna PCM 16-bit, 24kHz, Mono
   */
  const pcmToAudioBuffer = useCallback(
    async (base64PCM: string): Promise<AudioBuffer> => {
      if (!audioContextRef.current) {
        throw new Error("AudioContext not initialized");
      }

      // Decode base64 → binary
      const binaryString = atob(base64PCM);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Converter 16-bit PCM → Float32Array
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        const value = int16Array[i];
        if (value !== undefined) {
          float32Array[i] = value / 32768.0; // Normalizar para [-1, 1]
        }
      }

      // Criar AudioBuffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // Mono
        float32Array.length,
        24000, // 24kHz
      );

      audioBuffer.copyToChannel(float32Array, 0);
      return audioBuffer;
    },
    [],
  );

  /**
   * Agenda reprodução dos buffers na queue
   */
  const schedulePlayback = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    setState("playing");

    // Inicializar tempo se é primeira vez
    if (nextStartTimeRef.current === 0) {
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }

    // Processar todos os buffers na queue
    while (audioQueueRef.current.length > 0) {
      const buffer = audioQueueRef.current.shift();
      if (!buffer) continue;

      const source = audioContextRef.current.createBufferSource();

      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      // Agendar para tocar no tempo correto (sem gaps)
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;

      // Callback para atualizar progresso
      source.onended = () => {
        const current = audioContextRef.current?.currentTime || 0;
        setCurrentTime(current);
        setProgress(current / estimatedDuration);
      };
    }
  }, [estimatedDuration]);

  /**
   * Adiciona chunk à queue e agenda reprodução
   */
  const addChunkToQueue = useCallback(
    async (base64PCM: string) => {
      try {
        const audioBuffer = await pcmToAudioBuffer(base64PCM);
        audioQueueRef.current.push(audioBuffer);
        accumulatedDurationRef.current += audioBuffer.duration;

        logger.debug(
          {
            queueLength: audioQueueRef.current.length,
            bufferDuration: audioBuffer.duration,
          },
          "Added chunk to queue",
        );

        // Se não está tocando e tem buffer suficiente (2 chunks), inicia
        if (!isPlayingRef.current && audioQueueRef.current.length >= 2) {
          schedulePlayback();
        }
      } catch (error) {
        logger.error({ error }, "Failed to process audio chunk");
      }
    },
    [pcmToAudioBuffer, schedulePlayback],
  );

  /**
   * Inicia streaming via SSE usando fetch() com POST
   */
  const startStreaming = useCallback(async () => {
    try {
      cleanup();
      setState("connecting");

      // Inicializar AudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
      accumulatedDurationRef.current = 0;

      const url = `/api/stories/${params.uuid}/audio-stream`;
      setState("buffering");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || line.startsWith(":")) continue;

          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);

            try {
              const data = JSON.parse(jsonStr);

              switch (data.type) {
                case "cached":
                  logger.info({ audioUrl: data.audioUrl }, "Audio was cached");
                  onCached?.(data.audioUrl);
                  setState("complete");
                  return;

                case "chunk":
                  await addChunkToQueue(data.chunk);
                  break;

                case "complete":
                  logger.info(
                    { totalBytes: data.totalBytes },
                    "Streaming complete",
                  );
                  if (audioQueueRef.current.length > 0) {
                    schedulePlayback();
                  }
                  setState("complete");
                  return;

                case "error":
                  logger.error({ message: data.message }, "Streaming error");
                  toast.error("Erro ao gerar áudio", {
                    description: data.message,
                  });
                  setState("error");
                  return;
              }
            } catch (parseError) {
              logger.error({ parseError }, "Failed to parse SSE");
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error }, "Failed to start streaming");
      setState("error");
      toast.error("Erro ao iniciar áudio");
    }
  }, [
    params.uuid,
    messageId,
    cleanup,
    addChunkToQueue,
    schedulePlayback,
    onCached,
  ]);

  /**
   * Toggle play/pause
   */
  const togglePlay = useCallback(async () => {
    if (state === "idle" || state === "error") {
      startStreaming();
    } else if (state === "playing") {
      // Pausar
      audioContextRef.current?.suspend();
      isPlayingRef.current = false;
      setState("paused");
    } else if (state === "paused") {
      // Resume
      audioContextRef.current?.resume();
      isPlayingRef.current = true;
      setState("playing");
    }
  }, [state, startStreaming]);

  /**
   * Cancelar geração
   */
  const cancel = useCallback(() => {
    cleanup();
    setState("idle");
    setProgress(0);
    setCurrentTime(0);
  }, [cleanup]);

  // Waveform bars (visual)
  const [bars] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i.toString(),
      height: Math.max(0.3, Math.random()),
    })),
  );

  return (
    <Box alignItems="center" gap={3} className="h-8 select-none">
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={togglePlay}
        disabled={state === "connecting" || state === "error"}
        aria-label={state === "playing" ? "Pausar áudio" : "Reproduzir áudio"}
      >
        {state === "connecting" || state === "buffering" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : state === "playing" ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
      </Button>

      {/* Waveform progress bar */}
      <Box
        alignItems="center"
        className="h-full flex-1 gap-0.5 cursor-pointer group"
        aria-label="Barra de progresso do áudio"
      >
        {bars.map((bar, index) => {
          const barProgress = index / bars.length;
          const isPlayed = barProgress < progress;

          return (
            <div
              key={bar.id}
              className={cn(
                "w-1 rounded-full transition-colors duration-200",
                isPlayed
                  ? "bg-brand-900 dark:bg-brand-300"
                  : state === "buffering" || state === "connecting"
                    ? "bg-yellow-500 dark:bg-yellow-600 animate-pulse"
                    : "bg-brand-500 dark:bg-brand-600",
              )}
              style={{
                height: `${bar.height * 100}%`,
              }}
            />
          );
        })}
      </Box>

      {/* Status text */}
      <Box className="text-xs text-muted-foreground whitespace-nowrap">
        {state === "buffering" && "Gerando..."}
        {state === "playing" && "Reproduzindo"}
        {state === "complete" && "Concluído"}
        {state === "error" && <span className="text-red-500">Erro</span>}
      </Box>

      {/* Cancel button (só mostra durante geração) */}
      {(state === "buffering" ||
        state === "connecting" ||
        state === "playing") && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={cancel}
          aria-label="Cancelar geração"
        >
          <Volume2 size={16} className="opacity-50" />
        </Button>
      )}
    </Box>
  );
};

export const StreamingAudioPlayer = memo(
  StreamingAudioPlayerComponent,
  (prevProps, nextProps) =>
    prevProps.messageId === nextProps.messageId &&
    prevProps.contentLength === nextProps.contentLength,
);
