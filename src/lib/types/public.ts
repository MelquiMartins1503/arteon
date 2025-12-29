/**
 * Tipos públicos que usam UUID como identificador
 * Estes são usados em APIs, URLs e interfaces públicas
 */

export interface PublicStory {
  uuid: string;
  title: string | null;
  description: string | null;
  updatedAt: Date;
  order: number;
}

export interface PublicMessage {
  uuid: string;
  role: "USER" | "MODEL";
  content: string;
  summary: string | null;
  important: boolean;
  createdAt: Date;
}

export interface PublicUser {
  uuid: string;
  name: string | null;
  email: string;
}
