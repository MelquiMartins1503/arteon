import { type NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { apiErrorHandler } from "@/lib/apiErrorHandlers";

import {
  HttpExceptionClient,
  HttpExceptionServer,
} from "@/lib/exceptions/HttpExceptions";

import { getAuthenticatedUser } from "@/lib/getAuthenticatedUser";

import prismaClient from "@/lib/prismaClient";

import { getPresignedUrl, uploadFile } from "@/lib/storage";

// --- ENGENHARIA DE ÁUDIO ---

/**

* Constrói um cabeçalho WAV canônico de 44 bytes.

* O Gemini 2.5 TTS retorna nativamente PCM 16-bit, 24kHz, Mono.

* Sem este cabeçalho, o arquivo salvo será apenas "ruído estático" ou silêncio.

*/

function createWavHeader(
  dataLength: number,

  sampleRate = 24000,

  channels = 1,

  bitsPerSample = 16,
): Buffer {
  const header = Buffer.alloc(44);

  // 1. RIFF Chunk Descriptor

  header.write("RIFF", 0); // ChunkID

  header.writeUInt32LE(36 + dataLength, 4); // ChunkSize (36 + data size)

  header.write("WAVE", 8); // Format

  // 2. "fmt " Sub-chunk

  header.write("fmt ", 12); // Subchunk1ID

  header.writeUInt32LE(16, 16); // Subchunk1Size (16 para PCM)

  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM Linear)

  header.writeUInt16LE(channels, 22); // NumChannels (1 = Mono)

  header.writeUInt32LE(sampleRate, 24); // SampleRate (24000 Hz)

  header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28); // ByteRate

  header.writeUInt16LE(channels * (bitsPerSample / 8), 32); // BlockAlign

  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  // 3. "data" Sub-chunk

  header.write("data", 36); // Subchunk2ID

  header.writeUInt32LE(dataLength, 40); // Subchunk2Size

  return header;
}

// --- VALIDAÇÃO E HANDLERS ---

const bodySchema = z.object({
  messageId: z.number().int().positive(),
});

export async function POST(
  request: NextRequest,

  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const user = await getAuthenticatedUser();

    const { uuid } = await params;

    const body = await request.json();

    const { messageId } = bodySchema.parse(body);

    // 1. Validação de Segurança e Banco de Dados

    const story = await prismaClient.story.findUnique({
      where: { uuid: uuid },

      include: { conversationHistory: true },
    });

    if (!story || story.userId !== user.id || !story.conversationHistory) {
      throw new HttpExceptionClient(404, "História não encontrada ou inválida");
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

    // 2. Cache: Retorna URL se o áudio já foi gerado anteriormente

    if (message.audioUrl) {
      const signedUrl = await getPresignedUrl(message.audioUrl);

      return NextResponse.json({ audioUrl: signedUrl });
    }

    // 3. Integração com Gemini API

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) throw new HttpExceptionServer(500, "API Key não configurada");

    // Modelo TTS de maior qualidade

    // gemini-2.5-pro-preview-tts oferece melhor qualidade que flash-preview-tts

    const modelName = "gemini-2.5-pro-preview-tts";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    console.log(`[TTS] Gerando áudio para messageId: ${messageId}`);
    console.log(`[TTS] Modelo: ${modelName}`);
    console.log(
      `[TTS] Tamanho do conteúdo: ${message.content.length} caracteres`,
    );

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `Narrate this story with emotion and expression, using a natural, engaging pace. Bring the story to life with your voice:\n\n${message.content}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              // Vozes disponíveis: Fenrir, Leda, Orus, Aoede, Callirrhoe
              voiceName: "Leda",
            },
          },
        },
      },
    };

    console.log("[TTS] Request body:", JSON.stringify(requestBody, null, 2));

    const ttsResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!ttsResponse.ok) {
      const errorData = await ttsResponse.json();

      console.error("Erro Gemini API:", JSON.stringify(errorData, null, 2));

      throw new HttpExceptionServer(
        502,

        `Gemini falhou: ${errorData.error?.message || "Erro desconhecido na geração de áudio"}`,
      );
    }

    const data = await ttsResponse.json();

    // 4. Processamento do Áudio (Critical Fix)

    const candidate = data.candidates?.[0];

    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData);

    if (!audioPart?.inlineData?.data) {
      console.error("Resposta inesperada do Gemini:", JSON.stringify(data));

      throw new HttpExceptionServer(
        500,

        "O Gemini não retornou dados de áudio válidos.",
      );
    }

    // O Gemini retorna PCM Linear cru (sem header wav) em Base64

    const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");

    // Geração do Header WAV (Engenharia de Áudio)

    // Forçamos 24kHz pois é o padrão nativo dos modelos Gemini Flash 2.5

    const _wavHeader = createWavHeader(pcmBuffer.length, 24000, 1, 16);

    // Concatena Header + PCM para criar um arquivo.wav válido

    const finalAudioBuffer = Buffer.concat([_wavHeader, pcmBuffer]);

    const mimeType = "audio/wav"; // Agora é explicitamente um WAV

    const fileName = `audio/${uuid}/${message.id}.wav`;

    // 5. Upload para Storage (R2/S3)

    const storageKey = await uploadFile(fileName, finalAudioBuffer, mimeType);

    // 6. Persistência e Retorno

    await prismaClient.message.update({
      where: { id: messageId },

      data: { audioUrl: storageKey },
    });

    const signedUrl = await getPresignedUrl(storageKey);

    return NextResponse.json({ audioUrl: signedUrl });
  } catch (err) {
    return await apiErrorHandler(err);
  }
}
