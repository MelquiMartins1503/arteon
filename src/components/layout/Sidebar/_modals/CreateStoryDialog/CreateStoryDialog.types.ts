import z from "zod/v4";
import type { StorySidebarItem } from "@/features/story/actions";

export interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (story: StorySidebarItem) => void;
}

export const CreateStorySchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().optional(),
});

export type CreateStoryForm = z.infer<typeof CreateStorySchema>;
