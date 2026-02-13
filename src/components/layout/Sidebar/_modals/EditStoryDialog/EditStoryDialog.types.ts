import z from "zod/v4";

export interface EditStoryDialogProps {
  story: StoryToEdit | null;
  onClose: () => void;
  onSuccess: () => void;
}

export type StoryToEdit = {
  uuid: string;
  title: string | null;
  description: string | null;
  customPrompt: string | null;
};

export const UpdateStoryPromptSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().optional(),
  customPrompt: z.string(),
});

export type UpdateStoryPromptForm = z.infer<typeof UpdateStoryPromptSchema>;
