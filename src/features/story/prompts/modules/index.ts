/**
 * Mapeamento de comandos narrativos para módulos necessários
 *
 * Este arquivo define quais módulos devem ser carregados para cada comando.
 * Isso permite carregar apenas o contexto necessário, reduzindo uso de tokens.
 */

import type { NarrativeCommand } from "@/services/chat/CommandDetector";

/**
 * Mapeamento: Comando → Lista de módulos necessários
 *
 * Os caminhos são relativos ao diretório modules/
 * Exemplo: "core/narrativeCore" → modules/core/narrativeCore.ts
 */
export const COMMAND_MODULE_MAP: Record<NarrativeCommand, string[]> = {
  /**
   * [GERAR DECA] - Documento de Estado Canônico Atual
   * Requer: protocolo básico, lógica de navegação, estrutura e template DECA
   */
  GERAR_DECA: [
    "workflow/collaborationProtocol",
    "workflow/navigationLogic",
    "core/narrativeStructure",
    "templates/canonicalState",
  ],

  /**
   * [SUGERIR PRÓXIMA SEÇÃO] - Proposta detalhada de próxima seção
   * Requer: conceitos fundamentais + protocolo + ciclo + template de proposta
   */
  SUGERIR_PROXIMA_SECAO: [
    "workflow/collaborationProtocol",
    "workflow/navigationLogic",
    "workflow/generationCycle",
    "core/narrativeCore",
    "core/narrativeStructure",
    "core/narrativePillars",
    "templates/sectionProposal",
  ],

  /**
   * [SUGERIR ESTRUTURA DE SEÇÕES] - Roteiro de múltiplas seções
   * Requer: conceitos + protocolo + ciclo + template de estrutura
   */
  SUGERIR_ESTRUTURA_DE_SECOES: [
    "workflow/collaborationProtocol",
    "workflow/generationCycle",
    "core/narrativeCore",
    "core/narrativeStructure",
    "core/narrativePillars",
    "templates/sectionsStructure",
  ],

  /**
   * [APROVAR E SELAR ESBOÇO DE ESTRUTURA] - Aprovar estrutura de seções
   * Similar a SUGERIR_ESTRUTURA_DE_SECOES + gera primeira proposta
   */
  APROVAR_E_SELAR_ESBOÇO_DE_ESTRUTURA: [
    "workflow/collaborationProtocol",
    "workflow/generationCycle",
    "core/narrativeCore",
    "core/narrativeStructure",
    "core/narrativePillars",
    "templates/sectionsStructure",
    "templates/sectionProposal",
  ],

  /**
   * [APROVAR E SELAR ESBOÇO] - Gerar conteúdo narrativo completo
   * Requer: TODOS os módulos core + workflow + templates de conteúdo
   */
  APROVAR_E_SELAR_ESBOÇO: [
    "core/narrativeCore",
    "core/narrativeStructure",
    "core/narrativePillars",
    "core/styleAndTone",
    "workflow/collaborationProtocol",
    "workflow/navigationLogic",
    "workflow/generationCycle",
    "workflow/structureModel",
    "templates/narrativeContent",
  ],

  /**
   * [REVISAR E CORRIGIR] - Revisão de seção gerada
   * Requer: pilares, estilo, protocolo e modelo de estrutura
   */
  REVISAR_E_CORRIGIR: [
    "core/narrativePillars",
    "core/styleAndTone",
    "workflow/collaborationProtocol",
    "workflow/structureModel",
  ],

  /**
   * [RETOMAR NARRATIVA] - Retomar narrativa pausada
   * Similar a GERAR_DECA
   */
  RETOMAR_NARRATIVA: [
    "workflow/collaborationProtocol",
    "workflow/navigationLogic",
    "core/narrativeStructure",
    "templates/canonicalState",
  ],

  /**
   * Comando Geral - Para conversas sem comando específico
   * Apenas protocolo básico de colaboração
   */
  GENERAL: ["workflow/collaborationProtocol", "core/narrativeCore"],
  PAUSAR_NARRATIVA: [],
};

/**
 * Lista de todos os módulos disponíveis
 * Usado para carregar o briefing completo (compatibilidade retroativa)
 */
export const ALL_MODULES = [
  // Core
  "core/narrativeCore",
  "core/narrativeStructure",
  "core/narrativePillars",
  "core/styleAndTone",

  // Workflow
  "workflow/collaborationProtocol",
  "workflow/navigationLogic",
  "workflow/generationCycle",
  "workflow/structureModel",

  // Templates
  "templates/canonicalState",
  "templates/sectionProposal",
  "templates/sectionsStructure",
  "templates/narrativeContent",
];
