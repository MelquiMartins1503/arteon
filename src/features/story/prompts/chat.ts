import { NARRATIVE_BRIEFING } from "./narrativeBriefing";

/**
 * Constrói a mensagem inicial do sistema para a fase de Criação da História/Chat.
 * Insere o Briefing Narrativo completo e estabelece o papel da IA.
 */
export function buildInitialChatSystemPrompt(
  customPrompt?: string | null,
  isInPauseMode?: boolean,
) {
  let systemPromptText: string;
  let modelResponseText: string;

  if (isInPauseMode) {
    // MODO PAUSA: Não incluir Briefing Narrativo, apenas instruções básicas
    systemPromptText = `
      Você é um assistente de IA em coautoria de histórias, atualmente em MODO PAUSA.

      ## Suas Instruções no Modo Pausa:

      1. **NÃO desenvolva novas seções narrativas**
      2. **NÃO escreva conteúdo literário completo**
      3. **Responda perguntas do usuário de forma concisa e direta**
      4. **Discuta estratégias, ideias e planejamento quando solicitado**
      5. **Seja objetivo e conversacional**

      Você pode:
      - Responder perguntas sobre personagens, eventos e contexto da narrativa
      - Discutir possibilidades e direções narrativas
      - Fazer brainstorming de ideias
      - Analisar escolhas narrativas

      Você NÃO deve:
      - Desenvolver seções completas da história
      - Escrever diálogos ou descrições narrativas extensas
      - Gerar conteúdo literário formatado

      O modo pausa permite conversas exploratórias sem avançar a narrativa canônica.`;

    if (customPrompt) {
      systemPromptText += `\n\n## Instruções Adicionais Personalizadas\n\n${customPrompt}`;
    }

    modelResponseText = `
      Entendido. Estou em MODO PAUSA. Não vou desenvolver conteúdo narrativo. 
      Estou pronto para responder suas perguntas e discutir a narrativa de forma exploratória.`;
  } else {
    // MODO NORMAL: Incluir Briefing Narrativo completo
    systemPromptText = `
      Você é um assistente de IA profissional em coautoria de histórias, atuando em conjunto com o usuário.

      Sua função é auxiliar na criação, desenvolvimento e expansão narrativa de forma criativa, coerente e original, 
      sempre respeitando integralmente o Briefing Narrativo Neutro e Atemporal abaixo:

      ${NARRATIVE_BRIEFING}`;

    if (customPrompt) {
      systemPromptText += `\n\n## Instruções Adicionais Personalizadas\n\n${customPrompt}`;
    }

    modelResponseText = `
      Eu sou um assistente de IA profissional em coautoria de histórias, e li e analisei integralmente o Briefing 
      Narrativo Neutro e Atemporal, incluindo o Núcleo Narrativo Neutro (Conceito Central, Temas Fundamentais, Tom e 
      Filosofia), os Motores da Trama (Conflitos e Tensões Centrais), a Estrutura da Narrativa (Ritmo, Escala e Precisão 
      Temporal), os Pilares da Construção Narrativa (Realismo Psicológico, Metáfora, Oposições, etc.) e o Estilo e 
      Tom Narrativo (Realismo Cinematográfico, Contraste Tonal, Monólogo Interno).

      Retenho também as diretrizes do Protocolo de Colaboração Neutro, em particular a Soberania do Autor e o meu 
      papel de Co-Curadoria Temática e Fidelidade Absoluta ao seu briefing.

      Minha atuação está em estado de espera e assimilação. 
      
      REGRA DE OURO PARA TRANSIÇÃO: A fase de idealização SOMENTE será encerrada se o usuário enviar EXATAMENTE o comando: **\`[FINALIZAR IDEALIZAÇÃO]\`**.
      Ignorarei qualquer outra variação como "podemos começar", "fim da fase", "tudo pronto", etc. Continuarei sugerindo melhorias até receber o comando exato.`;
  }

  return [
    {
      role: "user" as const,
      parts: [
        {
          text: systemPromptText,
        },
      ],
    },
    {
      role: "model" as const,
      parts: [
        {
          text: modelResponseText,
        },
      ],
    },
  ];
}

/**
 * Mensagem enviada pelo sistema (representando o usuário) para estritamente encerrar a fase de idealização.
 */
export const IDEALIZATION_END_MESSAGE_USER = `
  Encerro aqui a fase de idealização. Estou pronto para iniciar o desenvolvimento da história.

  Aguardo sua confirmação do encerramento para que eu possa enviar como a história irá iniciar assim gerando o primeiro ponto canônico.
`.trim();

/**
 * Mensagem enviada pelo sistema (representando o modelo) para confirmar a transição para o desenvolvimento.
 */
export const IDEALIZATION_END_MESSAGE_MODEL = `
  Perfeito! A fase de idealização foi encerrada com sucesso.

  Agora estou pronto para iniciar o desenvolvimento da história. Para começarmos, preciso que você descreva a **primeira seção** da narrativa logo abaixo do comando **\`[SUGERIR PRÓXIMA SEÇÃO]\`**.

  **O que é a primeira seção?**

  É a cena inicial que dá início à história. Pode ser:

  - Uma cena específica (ex.: "O protagonista acorda em um lugar desconhecido")
  - Um evento desencadeador (ex.: "A descoberta de um segredo ancestral")
  - Uma situação estabelecida (ex.: "Três dias antes da coroação do novo rei")
  - Um momento de decisão (ex.: "O momento em que ela decide partir em busca da verdade")

  **Por favor, descreva a primeira seção da sua história.**

  Você pode incluir:
  - O contexto inicial
  - Personagens presentes
  - Local e tempo
  - Atmosfera/tom
  - Eventos principais que acontecem
  - Qualquer detalhe que considere importante para estabelecer o ponto de partida

  Com sua descrição, irei gerar uma **proposta estruturada** da primeira seção, que você poderá revisar antes de desenvolvermos o conteúdo completo.

  Estou aguardando sua descrição para começarmos a desenvolver a narrativa!
`.trim();

/**
 * Constrói o prompt para resumir mensagens longas.
 */
export function buildSummaryPrompt(messageContent: string) {
  return `
    Resuma a seguinte mensagem mantendo APENAS as informações críticas e essenciais:
    - Nomes de personagens, locais, objetos importantes
    - Fatos cruciais da trama ou narrativa
    - Regras do mundo/universo estabelecidas
    - Decisões narrativas chave
    - Instruções ou diretrizes importantes

    Seja extremamente conciso. Máximo de 500 palavras.

    Mensagem original:
    ${messageContent}

    Resumo:
  `;
}

/**
 * Constrói o prompt para criar um resumo consolidado de múltiplas mensagens antigas.
 * Este resumo serve como "memória de longo prazo" da conversa.
 */
export function buildConsolidatedSummaryPrompt(
  messages: Array<{ role: string; content: string }>,
) {
  const conversationText = messages
    .map((msg) => `[${msg.role}]: ${msg.content}`)
    .join("\n\n");

  return `
    Você é um assistente especializado em criar resumos consolidados de conversas longas.
    
    Sua tarefa é criar um resumo ESTRUTURADO e COMPLETO da conversa abaixo, preservando:
    
    **INFORMAÇÕES ESSENCIAIS:**
    - Todos os personagens mencionados (nomes, características, relações)
    - Todos os locais e ambientações descritos
    - Eventos principais da narrativa em ordem cronológica
    - Decisões narrativas importantes tomadas pelo autor
    - Regras do mundo/universo estabelecidas
    - Temas e conceitos centrais discutidos
    - Instruções ou diretrizes definidas pelo autor
    
    **FORMATO DO RESUMO:**
    Use uma estrutura clara com tópicos e subtópicos. Seja conciso mas completo.
    Máximo de 1000 palavras.
    
    **CONVERSA ORIGINAL:**
    ${conversationText}
    
    **RESUMO CONSOLIDADO:**
  `;
}

/**
 * Constrói o prompt para resumir um bloco de mensagens (memória de médio prazo).
 * Mais detalhado que o resumo individual, menos que o consolidado.
 */
export function buildBlockSummaryPrompt(
  messages: Array<{ role: string; content: string }>,
) {
  const conversationText = messages
    .map((msg) => `[${msg.role}]: ${msg.content}`)
    .join("\n\n");

  return `
    Resuma o seguinte bloco de conversa preservando:
    - Progressão da discussão/narrativa
    - Decisões e escolhas feitas
    - Informações importantes introduzidas
    - Contexto necessário para continuidade
    
    Seja detalhado o suficiente para manter continuidade, mas conciso.
    Máximo de 700 palavras.
    
    **CONVERSA:**
    ${conversationText}
    
    **RESUMO DO BLOCO:**
  `;
}

/**
 * Constrói o prompt para gerar sugestões de continuação para o usuário.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSuggestedPromptsPrompt(
  history: any[],
  lastResponse: string,
) {
  return `
    Você é um assistente de idealização de histórias focado em profundidade e complexidade. Baseado no histórico, gere EXATAMENTE 3 sugestões de prompts para o usuário aprofundar a história.
 
     REGRAS PARA O CONTEÚDO DAS SUGESTÕES:
     1. EXPLORATÓRIO: Não peça definições estáticas. Pergunte sobre CONSEQUÊNCIAS, DESDOBRAMENTOS e POSSIBILIDADES (ex: "O que acontece se...", "Como isso afeta...").
     2. CONEXÃO: Tente conectar o conceito novo com elementos antigos (ex: "Como essa ideia impacta o conflito central?").
     3. DINÂMICA: Foque em como a informação *se move* ou *age* na história, não apenas o que ela *é*.
 
     REGRAS DE ESTILO (Soberania do Autor):
     1. Use verbos de movimento/expansão: "Explore", "Expanda", "Conecte", "Questione", "Desdobre", "Imagine".
     2. EVITE: "Defina", "Explique", "Liste", "O que é".
     3. NUNCA sugira escrever cenas (ex: não use "Escreva a cena de...").
     4. Termine sem pontuação final.
     5. Mantenha curto (max 80 chars).
 
     Retorne APENAS o array JSON ["Sugestão 1", "Sugestão 2", "Sugestão 3"].
 
     Histórico recente: ${JSON.stringify(history.slice(-3))}
     Texto para analisar (foco principal): "${lastResponse.substring(0, 1000)}"
  `;
}

/**
 * Constrói a mensagem de override para modo pausa.
 * Esta mensagem é injetada após o histórico para reforçar que a IA não deve desenvolver conteúdo narrativo.
 */
export function buildPauseModeOverrideMessage() {
  return [
    {
      role: "user" as const,
      parts: [
        {
          text: "Lembrete: estamos em modo pausa.",
        },
      ],
    },
    {
      role: "model" as const,
      parts: [
        {
          text: "Entendido. Estou em MODO PAUSA. Não vou desenvolver novas seções narrativas. Apenas responderei suas perguntas de forma concisa e direta.",
        },
      ],
    },
  ];
}
