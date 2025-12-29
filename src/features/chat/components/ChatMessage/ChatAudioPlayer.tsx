import { Pause, Play } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";

interface ChatAudioPlayerProps {
  audioUrl: string;
}

const ChatAudioPlayerComponent = ({ audioUrl }: ChatAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate random heights for the waveform bars once
  const [bars] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i.toString(),
      height: Math.max(0.3, Math.random()),
    })),
  );

  useEffect(() => {
    // Cleanup anterior se existir
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    setIsLoading(true);
    setHasError(false);
    setIsPlaying(false);
    setProgress(0);

    const audio = new Audio();
    audio.preload = "metadata"; // Carrega apenas metadados inicialmente
    audioRef.current = audio;

    const updateProgress = () => {
      if (audio.duration && !Number.isNaN(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(1);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleError = () => {
      console.error("Erro ao carregar áudio:", audioUrl);
      setHasError(true);
      setIsLoading(false);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    // Definir src DEPOIS de adicionar listeners
    audio.src = audioUrl;

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.src = ""; // Limpar src
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    if (!audioRef.current || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (progress === 1) {
          audioRef.current.currentTime = 0;
          setProgress(0);
        }
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      setHasError(true);
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || hasError) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = Math.min(Math.max(x / rect.width, 0), 1);

    audioRef.current.currentTime = newProgress * duration;
    setProgress(newProgress);

    if (!isPlaying && !isLoading) {
      audioRef.current.play().catch((error) => {
        console.error("Erro ao reproduzir após seek:", error);
        setHasError(true);
      });
      setIsPlaying(true);
    }
  };

  if (hasError) {
    return (
      <Box alignItems="center" gap={3} className="h-8 select-none">
        <Box className="text-xs text-red-500">Erro ao carregar áudio</Box>
      </Box>
    );
  }

  return (
    <Box alignItems="center" gap={3} className="h-8 select-none">
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={togglePlay}
        disabled={isLoading || hasError}
        aria-label={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isPlaying ? (
          <Pause size={16} fill="currentColor" />
        ) : (
          <Play size={16} fill="currentColor" />
        )}
      </Button>

      <Box
        role="button"
        tabIndex={0}
        alignItems="center"
        className="h-full flex-1 gap-0.5 cursor-pointer group outline-none"
        onClick={handleSeek}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePlay();
          }
        }}
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
                  : "bg-brand-500 dark:bg-brand-600",
              )}
              style={{
                height: `${bar.height * 100}%`,
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

// Memoize to prevent re-renders when audioUrl hasn't changed
export const ChatAudioPlayer = memo(
  ChatAudioPlayerComponent,
  (prevProps, nextProps) => prevProps.audioUrl === nextProps.audioUrl,
);
