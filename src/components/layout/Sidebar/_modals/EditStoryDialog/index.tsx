"use client";

import { AlertDialog } from "@/components/AlertDialog";
import Field from "@/components/Field";
import Form from "@/components/Form";
import type { EditStoryDialogProps } from "./EditStoryDialog.types";
import { useEditStoryForm } from "./useEditStoryForm";

export function EditStoryDialog({
  story,
  onClose,
  onSuccess,
}: EditStoryDialogProps) {
  const { register, handleSubmit, reset, errors, isSubmitting } =
    useEditStoryForm({
      story,
      onSuccess,
      onClose,
    });

  return (
    <AlertDialog open={!!story} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Content>
        <Form as="form" onSubmit={handleSubmit} className="w-full">
          <AlertDialog.Header>
            <AlertDialog.Title>Editar História</AlertDialog.Title>
            <AlertDialog.Description>
              Modifique as informações da história e adicione instruções
              personalizadas para o modelo de IA.
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
                <Field.TextAreaWrapper minRows={3} maxRows={5}>
                  <Field.TextAreaInput
                    placeholder="Uma breve descrição sobre a história..."
                    {...register("description")}
                  />
                </Field.TextAreaWrapper>
              </Field.Root>
            </Field>

            <Field error={errors.customPrompt}>
              <Field.Root>
                <Form.Group>
                  <Field.Label>Instruções Adicionais para IA</Field.Label>
                  {errors.customPrompt && <Field.ErrorMessage />}
                </Form.Group>
                <Field.TextAreaWrapper minRows={4} maxRows={6}>
                  <Field.TextAreaInput
                    placeholder="Ex: Foque mais em descrições visuais e diálogos curtos..."
                    {...register("customPrompt")}
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
              Salvar
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </Form>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
