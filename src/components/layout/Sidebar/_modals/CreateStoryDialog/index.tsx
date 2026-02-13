"use client";

import { AlertDialog } from "@/components/AlertDialog";
import Field from "@/components/Field";
import Form from "@/components/Form";
import type { CreateStoryDialogProps } from "./CreateStoryDialog.types";
import { useCreateStoryForm } from "./useCreateStoryForm";

export function CreateStoryDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateStoryDialogProps) {
  const { register, handleSubmit, reset, errors, isSubmitting } =
    useCreateStoryForm({
      onSuccess,
      onClose,
    });

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialog.Content>
        <Form as="form" onSubmit={handleSubmit} className="w-full">
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
  );
}
