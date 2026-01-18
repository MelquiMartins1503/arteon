import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

/**
 * Configuração centralizada do sistema de chat
 */
export const CHAT_CONFIG = {
  /**
   * Configurações de memória hierárquica
   * OTIMIZADO: Reduzido para diminuir uso de tokens (era ~42k)
   */
  memory: {
    /** Número de mensagens mais recentes mantidas completas no contexto */
    immediateMessages: 20, // Reduzido de 25 → 12

    /** Tamanho do bloco para resumos de médio prazo */
    midTermBlockSize: 6, // Reduzido de 10 → 6

    /** Número de mensagens antigas antes de ativar resumo consolidado */
    consolidationThreshold: 25, // Reduzido de 50 → 25
  },

  /**
   * Configurações de sumarização
   * OTIMIZADO: Resumos mais agressivos para economizar tokens
   */
  summary: {
    /** Tamanho máximo de mensagem antes de resumir (em caracteres) */
    maxMessageLength: 1000, // Reduzido de 1500 → 1000

    /** Tamanho máximo do resumo consolidado (em palavras) */
    consolidatedMaxWords: 400, // Reduzido de 1000 → 400

    /** Tamanho máximo do resumo de bloco (em palavras) */
    blockMaxWords: 250, // Reduzido de 700 → 250

    /** Tamanho máximo do resumo individual (em palavras) */
    individualMaxWords: 300, // Reduzido de 500 → 300
  },

  /**
   * Configurações do modelo de IA
   */
  ai: {
    /**
     * Modelo do Gemini a ser usado
     * gemini-2.0-flash-exp pode ter filtros mais permissivos
     * gemini-2.5-pro é mais conservador
     */
    model: "gemini-2.5-pro",

    /**
     * Modelo mais econômico para modo pausa
     */
    pauseModel: "gemini-2.0-flash-exp",

    /** Temperatura para geração de texto */
    temperature: 0.7,

    /** Número máximo de sugestões de prompt */
    maxSuggestions: 3,

    /**
     * Configurações de segurança do Gemini
     *
     * BLOCK_NONE = Permite conteúdo criativo similar ao site do Gemini
     * BLOCK_ONLY_HIGH = Bloqueia apenas conteúdo muito explícito
     */
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE, // Permite conteúdo erótico/romântico
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ],
  },

  /**
   * Comandos especiais do sistema
   */
  commands: {
    /** Comando para finalizar a fase de idealização */
    finalizeIdealization: "[FINALIZAR IDEALIZAÇÃO]",

    /** Comando para aprovar e selar esboço */
    approveDraft: "[APROVAR E SELAR ESBOÇO]",

    /** Comando para revisar e corrigir seção */
    reviewSection: "[REVISAR E CORRIGIR SEÇÃO]",

    /** Marcador de conteúdo de interrupção */
    interruptionMarker: "*Geração interrompida pelo usuário.*",
  },

  /**
   * Limites de validação
   */
  validation: {
    /** Tamanho mínimo do prompt (em caracteres) */
    minPromptLength: 1,

    /** Tamanho máximo do prompt (em caracteres) */
    maxPromptLength: 10000,
  },

  /**
   * Configurações de retry
   */
  retry: {
    /** Número máximo de tentativas */
    maxAttempts: 3,

    /** Delay inicial entre tentativas (ms) */
    initialDelay: 1000,

    /** Multiplicador de backoff exponencial */
    backoffMultiplier: 2,
  },
};

export type ChatConfig = typeof CHAT_CONFIG;
