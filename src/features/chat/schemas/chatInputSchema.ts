import { z } from "zod/v4";

export const chatInputSchema = z.object({
  content: z.string().min(1, "A mensagem não pode estar vazia"),
  important: z.boolean(),
  isMeta: z.boolean(),
  generateSuggestions: z.boolean(),
  imageUrls: z.array(z.string()).transform((val) => val ?? []),
});

export type ChatInputFormValues = z.infer<typeof chatInputSchema>;
