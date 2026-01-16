"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod/v4";
import { AlertDialog } from "@/components/AlertDialog";
import Field from "@/components/Field";
import Form from "@/components/Form";
import {
  createStory,
  deleteStory,
  type StorySidebarItem,
  updateStoryPrompt,
} from "@/features/story/actions";

interface SidebarDialogsProps {
  storyToDelete: StorySidebarItem | null;
  setStoryToDelete: (story: StorySidebarItem | null) => void;
  storyToEdit: {
    uuid: string;
    title: string | null;
    description: string | null;
    customPrompt: string | null;
  } | null;
  setStoryToEdit: (
    story: {
      uuid: string;
      title: string | null;
      description: string | null;
      customPrompt: string | null;
    } | null,
  ) => void;
  isCreateStoryOpen: boolean;
  setIsCreateStoryOpen: (open: boolean) => void;
  stories: StorySidebarItem[];
  setStories: (
    updater: (prev: StorySidebarItem[]) => StorySidebarItem[],
  ) => void;
}

const CreateStorySchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().optional(),
});

const UpdateStoryPromptSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().optional(),
  customPrompt: z.string(),
  knowledgeBaseInput: z.string().optional(),
});

type CreateStoryForm = z.infer<typeof CreateStorySchema>;
type UpdateStoryPromptForm = z.infer<typeof UpdateStoryPromptSchema>;

export function SidebarDialogs({
  storyToDelete,
  setStoryToDelete,
  storyToEdit,
  setStoryToEdit,
  isCreateStoryOpen,
  setIsCreateStoryOpen,
  stories,
  setStories,
}: SidebarDialogsProps) {
  const router = useRouter();
  const pathname = usePathname();

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

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
  } = useForm<UpdateStoryPromptForm>({
    resolver: zodResolver(UpdateStoryPromptSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    criteriaMode: "firstError",
    defaultValues: {
      title: "",
      description: "",
      customPrompt: "",
      knowledgeBaseInput: "",
    },
  });

  const handleCreateStory = async (data: CreateStoryForm) => {
    const result = await createStory(data);
    if (result.success && result.storyUuid && result.story) {
      setStories((prev) => [...prev, result.story]);
      setIsCreateStoryOpen(false);
      reset();
      toast.success("História criada com sucesso!");
      router.push(`/stories/${result.storyUuid}`);
    } else {
      toast.error(result.error || "Falha ao criar história");
    }
  };

  const handleUpdateStoryPrompt = async (data: UpdateStoryPromptForm) => {
    if (!storyToEdit) return;

    // Backup current state for rollback
    const previousStories = stories;

    // Optimistic update
    setStories((prev) =>
      prev.map((s) =>
        s.uuid === storyToEdit.uuid ? { ...s, title: data.title } : s,
      ),
    );

    // Attempt to update
    const result = await updateStoryPrompt({
      storyUuid: storyToEdit.uuid,
      title: data.title,
      description: data.description,
      customPrompt: data.customPrompt,
      knowledgeBaseInput: data.knowledgeBaseInput,
    });

    if (result.success) {
      // Dispatch event to notify PageTitle component
      window.dispatchEvent(
        new CustomEvent("story-title-updated", {
          detail: { storyUuid: storyToEdit.uuid },
        }),
      );

      // Show success toast with import statistics if available
      if ("importStats" in result && result.importStats) {
        toast.success(
          `História atualizada! ${result.importStats.entitiesCreated} entidades e ${result.importStats.relationshipsCreated} relacionamentos importados.`,
        );
      } else {
        toast.success("História atualizada com sucesso!");
      }

      setStoryToEdit(null);
      resetEdit();
    } else {
      // Rollback optimistic update
      setStories(() => previousStories);
      toast.error(result.error || "Falha ao atualizar história");
    }
  };

  const handleDeleteStory = async () => {
    if (!storyToDelete) return;

    // Check if user is currently viewing this story
    const isOnStoryPage = pathname === `/stories/${storyToDelete.uuid}`;

    // Optimistic delete
    setStories((prev) => prev.filter((s) => s.uuid !== storyToDelete.uuid));
    setStoryToDelete(null); // Close modal

    await deleteStory(storyToDelete.uuid);

    // Redirect to home if user was viewing this story
    if (isOnStoryPage) {
      router.push("/");
    }
  };

  // Update form when storyToEdit changes
  useEffect(() => {
    if (storyToEdit) {
      setValue("title", storyToEdit.title || "");
      setValue("description", storyToEdit.description || "");
      setValue("customPrompt", storyToEdit.customPrompt || "");
    }
  }, [storyToEdit, setValue]);

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!storyToDelete}
        onOpenChange={(open) => !open && setStoryToDelete(null)}
      >
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Você tem certeza?</AlertDialog.Title>
            <AlertDialog.Description>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente a
              história.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancelar</AlertDialog.Cancel>
            <AlertDialog.Action onClick={handleDeleteStory}>
              Excluir
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>

      {/* Create Story Dialog */}
      <AlertDialog open={isCreateStoryOpen} onOpenChange={setIsCreateStoryOpen}>
        <AlertDialog.Content>
          <Form
            as="form"
            onSubmit={handleSubmit(handleCreateStory)}
            className="w-full"
          >
            <AlertDialog.Header>
              <AlertDialog.Title>Criar Nova História</AlertDialog.Title>
              <AlertDialog.Description>
                Dê um nome para sua nova aventura.
              </AlertDialog.Description>
            </AlertDialog.Header>

            <Form.Fieldset>
              <Field error={errors.title}>
                <Field.Root>
                  <Form.Group>
                    <Field.Label>Título</Field.Label>
                    {errors.title && <Field.ErrorMessage />}
                  </Form.Group>
                  <Field.InputWrapper>
                    <Field.Input
                      placeholder="Ex: A Jornada do Herói"
                      {...register("title")}
                    />
                  </Field.InputWrapper>
                </Field.Root>
              </Field>

              <Field error={errors.description}>
                <Field.Root>
                  <Field.Label>Descrição (Opcional)</Field.Label>
                  <Field.TextAreaWrapper minRows={4} maxRows={6}>
                    <Field.TextAreaInput
                      placeholder="Uma breve descrição sobre a história..."
                      {...register("description")}
                    />
                  </Field.TextAreaWrapper>
                </Field.Root>
              </Field>
            </Form.Fieldset>

            <AlertDialog.Footer>
              <AlertDialog.Cancel onClick={() => reset()}>
                Cancelar
              </AlertDialog.Cancel>
              <AlertDialog.Action type="submit" isLoading={isSubmitting}>
                Criar História
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </Form>
        </AlertDialog.Content>
      </AlertDialog>

      {/* Edit Story Prompt Dialog */}
      <AlertDialog
        open={!!storyToEdit}
        onOpenChange={(open) => !open && setStoryToEdit(null)}
      >
        <AlertDialog.Content>
          <Form
            as="form"
            onSubmit={handleSubmitEdit(handleUpdateStoryPrompt)}
            className="w-full"
          >
            <AlertDialog.Header>
              <AlertDialog.Title>Editar História</AlertDialog.Title>
              <AlertDialog.Description>
                Modifique as informações da história e adicione instruções
                personalizadas para o modelo de IA.
              </AlertDialog.Description>
            </AlertDialog.Header>

            <Form.Fieldset>
              <Field error={errorsEdit.title}>
                <Field.Root>
                  <Form.Group>
                    <Field.Label>Título</Field.Label>
                    {errorsEdit.title && <Field.ErrorMessage />}
                  </Form.Group>
                  <Field.InputWrapper>
                    <Field.Input
                      placeholder="Ex: A Jornada do Herói"
                      {...registerEdit("title")}
                    />
                  </Field.InputWrapper>
                </Field.Root>
              </Field>

              <Field error={errorsEdit.description}>
                <Field.Root>
                  <Field.Label>Descrição (Opcional)</Field.Label>
                  <Field.TextAreaWrapper minRows={3} maxRows={5}>
                    <Field.TextAreaInput
                      placeholder="Uma breve descrição sobre a história..."
                      {...registerEdit("description")}
                    />
                  </Field.TextAreaWrapper>
                </Field.Root>
              </Field>

              <Field error={errorsEdit.customPrompt}>
                <Field.Root>
                  <Form.Group>
                    <Field.Label>Instruções Adicionais para IA</Field.Label>
                    {errorsEdit.customPrompt && <Field.ErrorMessage />}
                  </Form.Group>
                  <Field.TextAreaWrapper minRows={4} maxRows={6}>
                    <Field.TextAreaInput
                      placeholder="Ex: Foque mais em descrições visuais e diálogos curtos..."
                      {...registerEdit("customPrompt")}
                    />
                  </Field.TextAreaWrapper>
                </Field.Root>
              </Field>

              <Field error={errorsEdit.knowledgeBaseInput}>
                <Field.Root>
                  <Form.Group>
                    <Field.Label>
                      Knowledge Base (Dossie) - Importação Automática
                    </Field.Label>
                    {errorsEdit.knowledgeBaseInput && <Field.ErrorMessage />}
                  </Form.Group>
                  <Field.TextAreaWrapper minRows={4} maxRows={6}>
                    <Field.TextAreaInput
                      placeholder={`Cole aqui informações estruturadas sobre a história. As informações serão processadas automaticamente e adicionadas à Knowledge Base.`}
                      {...registerEdit("knowledgeBaseInput")}
                    />
                  </Field.TextAreaWrapper>
                </Field.Root>
              </Field>
            </Form.Fieldset>

            <AlertDialog.Footer>
              <AlertDialog.Cancel onClick={() => resetEdit()}>
                Cancelar
              </AlertDialog.Cancel>
              <AlertDialog.Action type="submit" isLoading={isSubmittingEdit}>
                Salvar
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </Form>
        </AlertDialog.Content>
      </AlertDialog>
    </>
  );
}
