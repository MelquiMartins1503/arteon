import type {
  ExtractedEntity,
  ExtractedRelationship,
} from "./KnowledgeExtractor";

/**
 * Parser para processar informações estruturadas do Knowledge Base Input
 * Suporta formato YAML-like e Markdown
 */
export class KnowledgeBaseParser {
  /**
   * Processa o input do usuário e extrai entidades e relacionamentos
   */
  parseInput(input: string): {
    entities: ExtractedEntity[];
    relationships: ExtractedRelationship[];
  } {
    const entities: ExtractedEntity[] = [];
    const rawRelationships: Array<{
      from: string;
      to: string;
      type: string;
    }> = [];

    // 1. Identificar seções por headers Markdown (#, ##, ###)
    // Regex captura: (quebra de linha ou inicio) + (# repetido 1-6 vezes) + espaço + (Nome)
    const headerRegex = /(?:^|\n)(#{1,6})\s+(.+)/g;
    let match: RegExpExecArray | null;
    const sections: Array<{ name: string; content: string }> = [];
    let lastIndex = 0;
    let currentName = "";

    // Loop para encontrar todos os cabeçalhos
    while (true) {
      match = headerRegex.exec(input);
      if (!match) break;

      if (currentName) {
        // Salvar seção anterior
        sections.push({
          name: currentName,
          content: input.substring(lastIndex, match.index).trim(),
        });
      }
      currentName = match[2]?.trim() || "";
      lastIndex = headerRegex.lastIndex;
    }

    // Adicionar última seção
    if (currentName && lastIndex < input.length) {
      sections.push({
        name: currentName,
        content: input.substring(lastIndex).trim(),
      });
    }

    // Se nenhuma seção foi encontrada, tentar tratar tudo como uma (fallback)
    if (sections.length === 0 && input.trim()) {
      const firstLineIdx = input.indexOf("\n");
      if (firstLineIdx > -1) {
        sections.push({
          name: input
            .substring(0, firstLineIdx)
            .trim()
            .replace(/^#+\s+/, ""),
          content: input.substring(firstLineIdx).trim(),
        });
      }
    }

    // 2. Processar cada seção
    for (const section of sections) {
      // Ignorar índices ou títulos de documento genéricos se houver muitas seções
      if (
        sections.length > 1 &&
        (section.name.toLowerCase().includes("índice") ||
          section.name.toLowerCase().includes("dossiê") ||
          section.name.trim().length < 2)
      ) {
        continue;
      }

      const lines = section.content.split("\n");
      let type = "CHARACTER"; // Default
      let description = "";
      const attributes: Record<string, unknown> = {};
      const pendingRelationships: Array<{ target: string; type: string }> = [];

      // Heurística simples para detectar tipo pelo nome ou conteúdo
      if (section.name.match(/Casa|Família|Ordem|Império|Reino/i)) {
        type = "FACTION";
      } else if (section.name.match(/Cidade|Castelo|Vale|Montanha|Rio/i)) {
        type = "LOCATION";
      } else if (section.name.match(/Batalha|Guerra|Evento/i)) {
        type = "EVENT";
      }

      // Parsing de texto livre
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        // Tentar extrair pares Chave: Valor no início da linha
        // Ex: "Idade: 20", "Pai: Klaus", "- Status: Vivo"
        const keyValueMatch = line.match(/^[-*]?\s*([^:]+):\s*(.+)/);

        if (keyValueMatch) {
          const key = keyValueMatch[1]?.trim() || "";
          const value = keyValueMatch[2]?.trim() || "";
          const lowerKey = key.toLowerCase();

          // Verificar se é uma chave especial
          if (lowerKey === "tipo" || lowerKey === "type") {
            type = this.normalizeType(value);
          } else if (lowerKey === "descrição" || lowerKey === "description") {
            description += (description ? "\n" : "") + value;
          } else if (
            lowerKey === "relacionamentos" ||
            lowerKey === "relationships" ||
            lowerKey === "relações"
          ) {
            // Ignorar header de relacionamento
          } else {
            // Verificar se é um relacionamento conhecido
            const relType = this.normalizeRelationshipType(key);
            if (relType) {
              // É um relacionamento! Ex: "Pai: Klaus"
              pendingRelationships.push({
                type: key,
                target: value,
              });
            } else {
              // É um atributo comum
              attributes[key] = value;
            }
          }
        } else {
          // Linha sem ":", provavelmente descrição
          // Ignorar se for apenas um header Markdown interno ou lista vazia
          if (!line.startsWith("#") && !line.match(/^[-*]\s*$/)) {
            description += (description ? "\n" : "") + line;
          }
        }
      }

      // Consolidar Entidade
      entities.push({
        type: type as ExtractedEntity["type"],
        name: section.name.replace(/^\d+\.\s*/, ""),
        description:
          description.trim() || `Informações extraídas sobre ${section.name}`,
        aliases: [],
        attributes,
        importance: 8,
        isNew: true,
      });

      // Consolidar Relacionamentos
      for (const rel of pendingRelationships) {
        rawRelationships.push({
          from: section.name,
          to: rel.target,
          type: rel.type,
        });
      }
    }

    // 3. Processar relacionamentos finais
    const relationships: ExtractedRelationship[] = rawRelationships
      .map((rel): ExtractedRelationship | null => {
        const type = this.normalizeRelationshipType(rel.type);
        if (!type || !rel.to) return null;

        // Limpar alvo (remover pontuação final)
        const cleanTarget = rel.to.replace(/[.;,]+$/, "");

        return {
          fromEntityName: rel.from,
          toEntityName: cleanTarget,
          type,
          description: `${rel.from} ${this.formatRelationshipLabel(type)} ${cleanTarget}`,
          strength: 5,
        };
      })
      .filter((r): r is ExtractedRelationship => r !== null);

    return { entities, relationships };
  }

  /**
   * Normaliza tipo de entidade para o enum EntityType
   */
  private normalizeType(type: string): string {
    const mapping: Record<string, string> = {
      PERSONAGEM: "CHARACTER",
      CHARACTER: "CHARACTER",
      CHAR: "CHARACTER",
      LOCAL: "LOCATION",
      LOCATION: "LOCATION",
      LUGAR: "LOCATION",
      EVENTO: "EVENT",
      EVENT: "EVENT",
      OBJETO: "OBJECT",
      OBJECT: "OBJECT",
      ITEM: "OBJECT",
      FACÇÃO: "FACTION",
      FACCAO: "FACTION",
      FACTION: "FACTION",
      GRUPO: "FACTION",
      CONCEITO: "CONCEPT",
      CONCEPT: "CONCEPT",
      IDEIA: "CONCEPT",
    };

    return mapping[type] || "CONCEPT";
  }

  /**
   * Normaliza tipo de relacionamento para o enum RelationshipType
   */
  private normalizeRelationshipType(type: string): string | null {
    const mapping: Record<string, string> = {
      PAI: "FAMILY",
      MÃE: "FAMILY",
      MAE: "FAMILY",
      FILHO: "FAMILY",
      FILHA: "FAMILY",
      IRMÃO: "FAMILY",
      IRMAO: "FAMILY",
      IRMÃ: "FAMILY",
      IRMA: "FAMILY",
      FAMÍLIA: "FAMILY",
      FAMILIA: "FAMILY",
      FAMILY: "FAMILY",
      AMIGO: "FRIENDSHIP",
      AMIGA: "FRIENDSHIP",
      FRIENDSHIP: "FRIENDSHIP",
      ROMANCE: "ROMANCE",
      AMOR: "ROMANCE",
      ESPOSA: "ROMANCE",
      ESPOSO: "ROMANCE",
      CASADO: "ROMANCE",
      RIVAL: "RIVALRY",
      RIVALRY: "RIVALRY",
      INIMIGO: "ENEMY",
      ENEMY: "ENEMY",
      MENTOR: "MENTORSHIP",
      MENTORSHIP: "MENTORSHIP",
      SUPERIOR: "HIERARCHY",
      CHEFE: "HIERARCHY",
      HIERARQUIA: "HIERARCHY",
      HIERARCHY: "HIERARCHY",
      ALIADO: "ALLIANCE",
      ALLIANCE: "ALLIANCE",
      POSSE: "OWNERSHIP",
      POSSUI: "OWNERSHIP",
      OWNERSHIP: "OWNERSHIP",
      RESIDE: "RESIDENCE",
      MORA: "RESIDENCE",
      RESIDENCE: "RESIDENCE",
      MEMBRO: "MEMBERSHIP",
      MEMBERSHIP: "MEMBERSHIP",
      PARTICIPA: "PARTICIPATION",
      PARTICIPOU: "PARTICIPATION",
      PARTICIPATION: "PARTICIPATION",
      CRENÇA: "BELIEF",
      CRENCA: "BELIEF",
      ACREDITA: "BELIEF",
      BELIEF: "BELIEF",
      AFILIAÇÃO: "AFFILIATION",
      AFILIACAO: "AFFILIATION",
      AFFILIATION: "AFFILIATION",
    };

    const normalized = mapping[type.toUpperCase()];
    return normalized || null;
  }

  /**
   * Formata label de relacionamento para português
   */
  private formatRelationshipLabel(type: string): string {
    const labels: Record<string, string> = {
      FAMILY: "é familiar de",
      FRIENDSHIP: "é amigo de",
      ROMANCE: "tem romance com",
      RIVALRY: "é rival de",
      MENTORSHIP: "é mentor de",
      HIERARCHY: "é superior de",
      ALLIANCE: "é aliado de",
      ENEMY: "é inimigo de",
      OWNERSHIP: "possui",
      RESIDENCE: "reside em",
      MEMBERSHIP: "é membro de",
      PARTICIPATION: "participou de",
      BELIEF: "acredita em",
      AFFILIATION: "é afiliado a",
    };

    return labels[type] || type.toLowerCase();
  }
}
