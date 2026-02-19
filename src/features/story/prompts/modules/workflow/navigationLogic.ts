/**
 * Módulo Workflow: Lógica de Opções
 *
 * Sistema de navegação cronológica da narrativa:
 * - Definição das Opções (Destino/Avanço, Imediata, Intermediária)
 * - Princípio de Aprofundamento Vertical
 * - Lógica de Consumo das Opções
 *
 * Carregado pelos comandos:
 * - [GERAR DECA]
 * - [SUGERIR PRÓXIMA SEÇÃO]
 * - [RETOMAR NARRATIVA]
 */

export default `
## **Lógica de Opções: Navegação Cronológica**

As opções apresentadas nos documentos de controle **não representam caminhos alternativos (bifurcações)**, mas sim **pontos de navegação cronológica** dentro de um **fluxo narrativo linear predefinido**.

---

### **1. Definição das Opções**

- **Opção 1 — Destino / Avanço (Macro)**
  - Representa o **próximo grande marco narrativo**.
  - **PRIORIDADE DE ESTRUTURA:** Se houver uma **Estrutura de Seções Ativa** (aprovada via \`[APROVAR E SELAR ESBOÇO DE ESTRUTURA]\`), a Opção 1 **DEVE OBRIGATORIAMENTE** corresponder à próxima seção definida nessa estrutura.
  - **ATENÇÃO:** Esta opção deve ser usada com extrema cautela. Saltos temporais devem ser **evitados ao máximo**.
  - Só avance para um novo marco quando o contexto atual estiver **completamente esgotado** e todas as pontas soltas resolvidas.

- **Opção 2 — Imediata (Micro) [PRIORIDADE]**
  - Ocorre **logo após a cena atual** ou **simultaneamente em outro local**.
  - Desenvolve consequências diretas, reações ou desdobramentos imediatos.
  - Mantém continuidade emocional e causal.
  - **Esta deve ser a opção mais frequentemente escolhida**.

- **Opção 3 — Intermediária (Ponte) [PRIORIDADE]**
  - Ocorre **após a Opção 2** ou explora **eventos simultâneos** no mesmo período temporal.
  - Aprofunda transições, tensões, preparações ou mudanças graduais.
  - Permite explorar **perspectivas paralelas** e **ações simultâneas** sem avançar o tempo.

---

### **Princípio Chave: Aprofundamento Vertical (Profundidade do Momento Presente)**

**Regra de Ouro:** As opções (especialmente 2 e 3) não devem servir apenas para “avançar a história” (movimento horizontal), mas principalmente para **aprofundar a experiência do momento atual** (movimento vertical).

- **PRIORIDADE ABSOLUTA:** Explorar o “agora” da narrativa antes de qualquer avanço temporal.
- Priorize opções que explorem:
  - Detalhes sensoriais imersivos do ambiente ou ação.
  - Psicologia interna e reações emocionais imediatas.
  - Atmosfera e tensão do presente.
  - **Eventos simultâneos** em outros locais.
  - **Perspectivas paralelas** de outros personagens.
- **EVITE SALTOS TEMPORAIS DESNECESSÁRIOS:** Não deixe pontas soltas.

---

### **2. Lógica de Consumo das Opções (Cenários Padrão)**

**Cenário 1 — Escolha da Opção 1 (Avanço Direto) [DESENCORAJADO]**
- **ATENÇÃO:** Evitar sempre que possível, exceto para cumprir a **Estrutura de Seções Ativa**.
- Ocorre um **salto narrativo** para o marco principal.
- **IMPORTANTE:** As Opções 2 e 3 **aconteceram**, mas **não foram narradas** (off-screen).

**Cenário 2 — Escolha da Opção 2 (Imediata) [RECOMENDADO]**
- **Cenário preferencial.** Narra consequências imediatas ou eventos simultâneos.
- Mantém foco no presente.
- No próximo DECA:
  - A **Opção 3** reaparece como **recomendada**.
  - A **Opção 1** permanece disponível, mas deve ser evitada.

**Cenário 3 — Escolha da Opção 3 (Intermediária) [RECOMENDADO]**
- **Também preferencial.** Pode envolver salto curto e controlado ou eventos paralelos.
- **IMPORTANTE:** A Opção 2 **aconteceu**, mas **não foi narrada** ou ocorreu em paralelo.
- Priorize eventos simultâneos antes de avançar no tempo.

**Cenário 4 — Cena Esgotada / Compressão Narrativa**
- **Condições:** Cena atingiu limite dramático/informativo.
- **Comportamento:** O sistema pode apresentar **apenas a Opção 1**, fundindo Opções 2 e 3 como eventos implícitos (off-screen).
---

### **3. Consistência Textual (Regra de Ouro)**

- **PERSISTÊNCIA OBRIGATÓRIA:** Se uma opção (especialmente a Opção 1 - Macro) não for escolhida e permanecer disponível no próximo ciclo, seu texto descritivo deve ser **IDÊNTICO** ao apresentado anteriormente.
- **MOTIVO:** Evitar confusão sobre o destino ou a natureza da escolha. O jogador deve reconhecer que a opção de avanço principal continua sendo a mesma, apenas postergada.
- **EXCEÇÃO:** Apenas se o contexto narrativo mudar drasticamente a ponto de tornar a descrição anterior inválida (o que deve ser raro para a Opção Macro).
- Em cenário onde uma estrutura de seções esteja ativa a opção escolhida pela IA deve mencionar que aquela opção refere-se s próxima seção precista pela estrutura e essa opção sempre deve ser a primeira.

`;
