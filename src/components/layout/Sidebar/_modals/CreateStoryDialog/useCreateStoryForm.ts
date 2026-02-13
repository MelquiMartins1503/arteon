import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createStory, type StorySidebarItem } from "@/features/story/actions";
import {
  type CreateStoryForm,
  CreateStorySchema,
} from "./CreateStoryDialog.types";

interface UseCreateStoryFormProps {
  onSuccess: (story: StorySidebarItem) => void;
  onClose: () => void;
}

export function useCreateStoryForm({
  onSuccess,
  onClose,
}: UseCreateStoryFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStoryForm>({
    resolver: zodResolver(CreateStorySchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    criteriaMode: "firstError",
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = async (data: CreateStoryForm) => {
    const result = await createStory(data);

    if (result.success && result.storyUuid && result.story) {
      onSuccess(result.story);
      onClose();
      reset();
      toast.success("História criada com sucesso!");
      router.push(`/stories/${result.storyUuid}`);
    } else {
      toast.error(result.error || "Falha ao criar história");
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
