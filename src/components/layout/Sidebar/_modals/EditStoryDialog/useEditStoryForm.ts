import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateStoryPrompt } from "@/features/story/actions";
import {
  type StoryToEdit,
  type UpdateStoryPromptForm,
  UpdateStoryPromptSchema,
} from "./EditStoryDialog.types";

interface UseEditStoryFormProps {
  story: StoryToEdit | null;
  onSuccess: () => void;
  onClose: () => void;
}

export function useEditStoryForm({
  story,
  onSuccess,
  onClose,
}: UseEditStoryFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdateStoryPromptForm>({
    resolver: zodResolver(UpdateStoryPromptSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    criteriaMode: "firstError",
    defaultValues: {
      title: "",
      description: "",
      customPrompt: "",
    },
  });

  // Update form when story changes
  useEffect(() => {
    if (story) {
      setValue("title", story.title || "");
      setValue("description", story.description || "");
      setValue("customPrompt", story.customPrompt || "");
    }
  }, [story, setValue]);

  const onSubmit = async (data: UpdateStoryPromptForm) => {
    if (!story) return;

    const result = await updateStoryPrompt({
      storyUuid: story.uuid,
      title: data.title,
      description: data.description,
      customPrompt: data.customPrompt,
    });

    if (result.success) {
      // Dispatch event to notify PageTitle component
      window.dispatchEvent(
        new CustomEvent("story-title-updated", {
          detail: { storyUuid: story.uuid },
        }),
      );

      toast.success("História atualizada com sucesso!");
      onSuccess();
      onClose();
      reset();
    } else {
      toast.error(result.error || "Falha ao atualizar história");
    }
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    reset,
    errors,
    isSubmitting,
  };
}
