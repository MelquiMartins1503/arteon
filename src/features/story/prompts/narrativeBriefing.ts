/**
 * Briefing Narrativo Neutro e Atemporal
 *
 * NOTA: Este arquivo foi modularizado para otimizar o uso de tokens.
 * Os módulos especializados são carregados dinamicamente com base no comando detectado.
 *
 * Para compatibilidade retroativa, este arquivo re-exporta todo o briefing combinado.
 * Use `loadModulesForCommand()` para carregar apenas os módulos necessários.
 */

import { loadAllModules } from "./utils/moduleLoader";

/**
 * Cache do briefing narrativo completo
 * Carregado de forma lazy na primeira chamada
 */
let _cachedNarrativeBriefing: string | null = null;

/**
 * Obtém o Briefing Narrativo completo (todos os módulos combinados)
 *
 * Usa lazy loading para evitar problemas com top-level await.
 * O briefing é carregado uma vez e cacheado para chamadas subsequentes.
 *
 * @returns Promise com o briefing narrativo completo
 */
export async function getNarrativeBriefing(): Promise<string> {
  if (!_cachedNarrativeBriefing) {
    _cachedNarrativeBriefing = await loadAllModules();
  }
  return _cachedNarrativeBriefing;
}

/**
 * Briefing Narrativo completo (todos os módulos combinados)
 *
 * @deprecated Use `getNarrativeBriefing()` ou `loadModulesForCommand()` para otimizar tokens
 *
 * NOTA: Esta é uma versão síncrona vazia para compatibilidade retroativa.
 * Para obter o briefing completo, use a função assíncrona `getNarrativeBriefing()`.
 */
export const NARRATIVE_BRIEFING = "";

export { COMMAND_MODULE_MAP } from "./modules";
// Re-export do sistema de carregamento modular
export { loadModulesForCommand } from "./utils/moduleLoader";
