import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiErrorHandler } from "@/lib/apiErrorHandlers";
import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "@/lib/exceptions/HttpExceptions";
import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";
import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";
import { getPresignedUrl, uploadFile } from "@/lib/storage";

const bodySchema = z.object({
  messageId: z.number().int().positive(),
});

/**
 * Cria cabeçalho WAV para PCM 16-bit, 24kHz, Mono
 * Cloud TTS retorna PCM bruto, precisamos adicionar header
 */
function createWavHeader(
  dataLength: number,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

// Singleton client
let ttsClient: TextToSpeechClient | null = null;

function getTTSClient(): TextToSpeechClient {
  if (ttsClient) return ttsClient;

  // Opção A: Usar GOOGLE_APPLICATION_CREDENTIALS env var
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    logger.info("Using GOOGLE_APPLICATION_CREDENTIALS");
    ttsClient = new TextToSpeechClient();
    return ttsClient;
  }

  // Opção B: Usar credenciais em base64
  if (process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64) {
    logger.info("Using GOOGLE_CLOUD_CREDENTIALS_BASE64");
    const credentials = JSON.parse(
      Buffer.from(
        process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64,
        "base64",
      ).toString(),
    );
    ttsClient = new TextToSpeechClient({ credentials });
    return ttsClient;
  }

  // Opção C: Usar campos individuais (para Vercel/produção)
  if (
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_PROJECT_ID
  ) {
    logger.info("Using individual Google Cloud credentials");
    ttsClient = new TextToSpeechClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
    return ttsClient;
  }

  throw new HttpExceptionServer(
    500,
    "Google Cloud credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_CREDENTIALS_BASE64, or individual credential vars.",
  );
}

/**
 * Remove formatação Markdown e caracteres especiais que não devem ser lidos
 * Remove: #, *, links markdown, imagens, etc.
 */
function cleanMarkdown(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove headers (# Header) mantendo o texto
      .replace(/^#+\s+/gm, "")
      // Remove bold/italic (**text**, *text*, __text__, _text_)
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // Remove links ([text](url)) mantendo apenas o texto
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove imagens (![alt](url)) - opcionalmente remover tudo ou manter alt
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
      // Remove blockquotes (>)
      .replace(/^>\s+/gm, "")
      // Remove code blocks (```...```) mantendo o conteúdo (ou removendo se preferir)
      // Aqui vamos manter o conteúdo mas remover os backticks
      .replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```/g, "");
      })
      // Remove inline code (`code`)
      .replace(/`([^`]+)`/g, "$1")
      // Remove listas (- item, * item)
      .replace(/^[*-]\s+/gm, "")
      // Remove separator lines (---)
      .replace(/^\s*---\s*$/gm, "")
      // Remove caracteres especiais soltos que podem atrapalhar a leitura
      .replace(/[#*]/g, "")
  );
}

/**
 * Divide texto em chunks de até maxBytes
 * Cloud TTS API tem limite de 5000 bytes por request
 */
function chunkText(text: string, maxBytes = 4500): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split("\n\n").filter((p) => p.trim());

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const testChunk = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;

    if (Buffer.byteLength(testChunk, "utf-8") > maxBytes) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph;
    } else {
      currentChunk = testChunk;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Google Cloud Text-to-Speech Streaming API Route
 *
 * STREAMING REAL: Divide texto em chunks e gera áudio progressivamente
 * Latência esperada: ~500ms para primeiro chunk
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { uuid } = await params;
    const body = await request.json();
    const { messageId } = bodySchema.parse(body);

    // 1. Validação
    const story = await prismaClient.story.findUnique({
      where: { uuid: uuid },
      include: { conversationHistory: true },
    });

    if (!story || story.userId !== user.id || !story.conversationHistory) {
      throw new HttpExceptionClient(404, "História não encontrada");
    }

    const message = await prismaClient.message.findFirst({
      where: {
        id: messageId,
        conversationHistoryId: story.conversationHistory.id,
      },
    });

    if (!message) {
      throw new HttpExceptionClient(404, "Mensagem não encontrada");
    }

    // 2. Check cache
    if (message.audioUrl) {
      logger.info({ messageId, cached: true }, "Audio already cached");

      const encoder = new TextEncoder();

      // Gerar URL assinada para o áudio em cache
      const signedUrl = await getPresignedUrl(message.audioUrl);

      const stream = new ReadableStream({
        start(controller) {
          const data = `data: ${JSON.stringify({
            type: "cached",
            audioUrl: signedUrl,
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 3. Preparar chunking (limpando markdown)
    const cleanContent = cleanMarkdown(message.content);
    const textChunks = chunkText(cleanContent);

    logger.info(
      {
        messageId,
        contentLength: message.content.length,
        chunks: textChunks.length,
        service: "Google Cloud TTS",
      },
      "Starting Cloud TTS streaming generation",
    );

    // 4. Stream SSE com Cloud TTS
    const encoder = new TextEncoder();
    const client = getTTSClient();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let totalAudioSize = 0;
          const audioBuffers: Buffer[] = []; // Acumular para salvar depois

          for (let i = 0; i < textChunks.length; i++) {
            const currentChunk = textChunks[i];
            if (!currentChunk) continue;

            const chunkStartTime = Date.now();

            logger.debug(
              {
                chunkIndex: i,
                totalChunks: textChunks.length,
                chunkLength: currentChunk.length,
              },
              "Generating TTS chunk",
            );

            // Gerar áudio para este chunk
            const [response] = await client.synthesizeSpeech({
              input: { text: currentChunk },
              voice: {
                languageCode: "pt-BR",
                name: "pt-BR-Chirp3-HD-Sulafat", // Voz Studio/Journey HD
                ssmlGender: "FEMALE",
              },
              audioConfig: {
                audioEncoding: "LINEAR16",
                sampleRateHertz: 24000,
                // Chirp voices já são naturais, removendo tuning artificial
              },
            });

            if (!response.audioContent) {
              throw new Error(`No audio content in chunk ${i}`);
            }

            const audioBuffer = Buffer.from(response.audioContent);
            const base64Audio = audioBuffer.toString("base64");
            totalAudioSize += audioBuffer.length;
            audioBuffers.push(audioBuffer); // Acumular

            const chunkTime = Date.now() - chunkStartTime;

            logger.info(
              {
                chunkIndex: i,
                chunkSize: audioBuffer.length,
                generationTime: chunkTime,
              },
              "Generated and sending TTS chunk",
            );

            // Enviar chunk via SSE
            const sseData = `data: ${JSON.stringify({
              type: "chunk",
              chunk: base64Audio,
              index: i,
              total: textChunks.length,
            })}\n\n`;

            controller.enqueue(encoder.encode(sseData));
          }

          // 5. Salvar arquivo completo no R2
          logger.info("Saving complete audio to R2...");

          const completePCM = Buffer.concat(audioBuffers);
          const wavHeader = createWavHeader(completePCM.length);
          const completeWAV = Buffer.concat([wavHeader, completePCM]);

          const fileName = `audio/${uuid}/${messageId}_${Date.now()}.wav`;
          const uploadKey = await uploadFile(
            fileName,
            completeWAV,
            "audio/wav",
          );

          logger.info(
            { fileName, size: completeWAV.length },
            "Audio uploaded to R2",
          );

          // 6. Atualizar banco de dados
          await prismaClient.message.update({
            where: { id: messageId },
            data: { audioUrl: uploadKey },
          });

          logger.info({ messageId, audioUrl: uploadKey }, "Database updated");

          // 7. Obter URL pré-assinada para retornar ao cliente
          const signedUrl = await getPresignedUrl(uploadKey);

          // Enviar complete com audioUrl
          const completeData = `data: ${JSON.stringify({
            type: "complete",
            totalBytes: totalAudioSize,
            totalChunks: textChunks.length,
            audioUrl: signedUrl,
          })}\n\n`;
          controller.enqueue(encoder.encode(completeData));

          logger.info(
            {
              messageId,
              totalAudioSize,
              totalChunks: textChunks.length,
              saved: true,
            },
            "Cloud TTS streaming completed and saved successfully",
          );

          controller.close();
        } catch (error) {
          logger.error(
            {
              error,
              messageId,
              errorMessage: error instanceof Error ? error.message : "Unknown",
              errorStack: error instanceof Error ? error.stack : undefined,
            },
            "Error in Cloud TTS generation",
          );

          const errorData = `data: ${JSON.stringify({
            type: "error",
            message:
              error instanceof Error ? error.message : "Erro ao gerar áudio",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
