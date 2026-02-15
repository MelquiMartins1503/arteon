/**
 * Módulo Template: DECA (Documento de Estado Canônico Atual)
 *
 * Template e instruções para geração de DECA (estado atual da narrativa):
 * - Formato do documento DECA
 * - Template de retomada de narrativa
 *
 * Carregado pelos comandos:
 * - [GERAR DECA]
 * - [RETOMAR NARRATIVA]
 */

export default `
## **FASE 1: GERAÇÃO DO DECA (Onde Estamos Agora?)**

**Objetivo:** Estabelecer o estado canônico atual da história antes de qualquer avanço.  
**Comando Inicial:** O Autor inicia o ciclo solicitando **\`[GERAR DECA]\`**.

### **Guia de Formato e Conteúdo do DECA**

O DECA (Documento de Estado Canônico Atual) é a bússola da narrativa. Ele deve ser gerado sempre que uma seção for finalizada e oficializada.

> ***Modelo***
>
> ### **DOCUMENTO DE ESTADO CANÔNICO ATUAL (DECA)**
>
> **Referência:** \`[Capítulo X – Título do Capítulo - Seção Y]\`
>
> ---
>
> **1. Última Seção Canônica**
>
> - **Capítulo**: \`[Número e Título do Capítulo]\`
> - **Seção**: \`[Título da Seção]\`
> - **Propósito**: Localizar precisamente a última cena no "índice" da narrativa.
>
> **2. Último Evento Relevante**
>
> - \`[Parágrafo conciso resumindo os acontecimentos principais e o clímax da última seção.]\`
>
> **3. Status das Frentes Ativas**
>
> - \`[Lista das principais linhas narrativas e seus estados atuais.]\`
>   - Exemplos: *Frente da Conspiração, Frente Relacional, Frente Política.*
>
> **4. Status Geral e Opções de Navegação**
>
> - **Saga**: \`[Estado geral da narrativa e tom predominante.]\`
> - **Tramas Imediatas (Baseado na Lógica de Opções)**:
>   - **Opção 1 (Destino / Avanço):** \`[Descrição do próximo grande marco narrativo. SE houver uma ESTRUTURA DE SEÇÕES ATIVA, esta opção deve ser a PRÓXIMA SEÇÃO da estrutura.]\`
>     - *Tempo e Local:* \`[Quando e onde.]\`
>   - **Opção 2 (Imediata):** \`[Descrição da reação ou consequência imediata.]\`
>     - *Status:* \`[Disponível / Indisponível / Comprimida]\`
>     - *Tempo e Local:* \`[Imediato.]\`
>   - **Opção 3 (Intermediária):** \`[Descrição da ponte narrativa ou transição.]\`
>     - *Status:* \`[Disponível / Indisponível / Recomendada]\`
>     - *Tempo e Local:* \`[Entre o agora e o destino.]\`
>
> **5. Data Canônica Atual**
>
> - \`[Data completa e específica: Dia, Mês, Ano e Hora do encerramento da seção. Nada de datas relativas.]\`
>
> ---
>
> **Próximo passo recomendado:**
>
> - **\`[SUGERIR PRÓXIMA SEÇÃO]\`** + (Número da Opção)
> - **\`[SUGERIR ESTRUTURA DE SEÇÕES]\`** → Criar roteiro de 5–8 seções (disponível apenas se não houver estrutura criada).
> - **\`[PAUSAR NARRATIVA (Análise Tática)]\`**
>
> Aguardando seu comando.
>
> ---

> ***Modelo***
>
> **NARRATIVA RETOMADA**
> - **Capítulo atual:** [Número e Título do Capítulo da última seção canônica]
> - **Seção:** [Título da seção da última seção canônica]
> - **Tempo e local:** [Tempo e local onde a última seção canônica aconteceu]
> - **Tramas Imediatas (Baseado na Lógica de Opções)**:
>   - **Opção 1 (Destino / Avanço):** \`[Descrição do próximo grande marco narrativo.]\`
>     - *Tempo e Local:* \`[Quando e onde.]\`
>   - **Opção 2 (Imediata):** \`[Descrição da reação ou consequência imediata.]\`
>     - *Status:* \`[Disponível / Indisponível / Comprimida]\`
>     - *Tempo e Local:* \`[Imediato.]\`
>   - **Opção 3 (Intermediária):** \`[Descrição da ponte narrativa ou transição.]\`
>     - *Status:* \`[Disponível / Indisponível / Recomendada]\`
>     - *Tempo e Local:* \`[Entre o agora e o destino.]\`
>
> **Próximo passo recomendado:**
> - **\`[SUGERIR PRÓXIMA SEÇÃO]\`** → Planejar apenas o próximo passo imediato.
> - **\`[SUGERIR ESTRUTURA DE SEÇÕES]\`** → Criar roteiro de 5–8 seções (disponível apenas se não houver estrutura criada).
> - **\`[PAUSAR NARRATIVA (Análise Tática)]\`**
>
> Aguardando seu comando.
`;
