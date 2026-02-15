import type { NarrativeCommand } from "@/services/chat/CommandDetector";
import { COMMAND_MODULE_MAP } from "../modules";

/**
 * Carrega e combina módulos do briefing narrativo com base no comando detectado
 *
 * @param command - Comando narrativo detectado
 * @returns String com todos os módulos relevantes combinados
 */
export async function loadModulesForCommand(
  command: NarrativeCommand,
): Promise<string> {
  const moduleNames = COMMAND_MODULE_MAP[command] || [];

  if (moduleNames.length === 0) {
    console.warn(`No modules mapped for command: ${command}`);
    return "";
  }

  const modules = await Promise.all(
    moduleNames.map(async (moduleName) => {
      try {
        const module = await import(`../modules/${moduleName}`);

        if (!module.default) {
          throw new Error(`Module "${moduleName}" has no default export`);
        }

        if (typeof module.default !== "string") {
          throw new Error(
            `Module "${moduleName}" default export is not a string`,
          );
        }

        return module.default;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[CRITICAL] Failed to load briefing module: ${moduleName}`,
          {
            command,
            moduleName,
            error: errorMessage,
          },
        );

        // Fail-fast: Se um módulo crítico falhar, o sistema deve falhar visivelmente
        throw new Error(
          `Failed to load critical briefing module "${moduleName}" for command "${command}": ${errorMessage}`,
        );
      }
    }),
  );

  // Combina todos os módulos com separadores
  return modules.filter((m) => m.length > 0).join("\n\n---\n\n");
}

/**
 * Carrega todos os módulos (para compatibilidade retroativa)
 *
 * @returns String com todo o briefing narrativo completo
 */
export async function loadAllModules(): Promise<string> {
  const allModuleNames = [
    // Core modules
    "core/narrativeCore",
    "core/narrativeStructure",
    "core/narrativePillars",
    "core/styleAndTone",
    // Workflow modules
    "workflow/collaborationProtocol",
    "workflow/navigationLogic",
    "workflow/generationCycle",
    "workflow/structureModel",
    // Template modules
    "templates/canonicalState",
    "templates/sectionProposal",
    "templates/sectionsStructure",
    "templates/narrativeContent",
  ];

  const modules = await Promise.all(
    allModuleNames.map(async (moduleName) => {
      try {
        const module = await import(`../modules/${moduleName}`);

        if (!module.default) {
          throw new Error(`Module "${moduleName}" has no default export`);
        }

        if (typeof module.default !== "string") {
          throw new Error(
            `Module "${moduleName}" default export is not a string`,
          );
        }

        return module.default;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[CRITICAL] Failed to load briefing module: ${moduleName}`,
          {
            moduleName,
            error: errorMessage,
          },
        );

        // Fail-fast para garantir integridade do briefing completo
        throw new Error(
          `Failed to load critical briefing module "${moduleName}": ${errorMessage}`,
        );
      }
    }),
  );

  return `
  # Briefing Narrativo Neutro e Atemporal
  
  # **Núcleo Narrativo Neutro: Diretrizes Fundamentais da Obra**

  ${modules.filter((m) => m.length > 0).join("\n\n---\n\n")}
  `;
}
