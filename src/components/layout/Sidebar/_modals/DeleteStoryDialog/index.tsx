"use client";

import { AlertDialog } from "@/components/AlertDialog";
import type { StorySidebarItem } from "@/features/story/actions";

export interface DeleteStoryDialogProps {
  story: StorySidebarItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteStoryDialog({
  story,
  onClose,
  onConfirm,
}: DeleteStoryDialogProps) {
  return (
    <AlertDialog open={!!story} onOpenChange={(open) => !open && onClose()}>
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
          <AlertDialog.Action onClick={onConfirm}>Excluir</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}
