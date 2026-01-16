import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/Button";
import logger from "@/lib/logger";

interface ChatInputImageButtonProps {
  onImagesUploaded: (urls: string[]) => void;
  disabled?: boolean;
}

export const ChatInputImageButton: React.FC<ChatInputImageButtonProps> = ({
  onImagesUploaded,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validar número de arquivos
    if (files.length > 5) {
      toast.error("Máximo de 5 imagens por vez");
      return;
    }

    // Validar cada arquivo
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande. Máximo: 5MB`);
        return;
      }
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("images", file);
      });

      // Use fetch directly for FormData (api helper forces application/json)
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || response.statusText);
      }

      const data = (await response.json()) as { urls: string[]; count: number };

      onImagesUploaded(data.urls);
      toast.success(`${data.count} imagem(ns) anexada(s)`);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      logger.error({ error }, "Failed to upload images");
      toast.error("Erro ao fazer upload das imagens");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="secondary"
        size="md"
        width="md"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        aria-label="Anexar imagens"
        className="p-0"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus size={20} strokeWidth={1.5} />
        )}
      </Button>
    </>
  );
};
