import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { api } from "@/lib/api";
import logger from "@/lib/logger";

interface ChatInputImagePreviewProps {
  imageKeys: string[];
  onRemove: (index: number) => void;
}

export const ChatInputImagePreview: React.FC<ChatInputImagePreviewProps> = ({
  imageKeys,
  onRemove,
}) => {
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    const loadUrls = async () => {
      try {
        const response = await api.post<{
          urls: Array<{ key: string; url: string | null }>;
        }>("/presigned-url", {
          keys: imageKeys,
        });

        setImageUrls(response.urls.map((item) => item.url));
      } catch (error) {
        logger.error({ error }, "Failed to get presigned URLs");
        setImageUrls(imageKeys.map(() => null));
      }
    };

    loadUrls();
  }, [imageKeys]);

  if (imageKeys.length === 0) return null;

  return (
    <Box gap={2} className="flex-wrap mb-2">
      {imageKeys.map((key, index) => (
        <div key={key} className="relative group">
          <div className="overflow-hidden w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-800">
            {imageUrls[index] ? (
              <Image
                src={imageUrls[index] || ""}
                alt={`Preview ${index + 1}`}
                width={80}
                height={80}
                quality={100}
                unoptimized
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex justify-center items-center w-full h-full">
                <div className="text-xs animate-pulse text-brand-400">
                  Carregando...
                </div>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(index)}
            className="absolute -top-2 -right-2 bg-red-500 rounded-full opacity-0 transition-opacity hover:bg-red-600 focus:bg-red-600 text-brand-50 group-hover:opacity-100 group-focus:opacity-100"
            aria-label="Remover imagem"
          >
            <X size={16} strokeWidth={1.5} />
          </Button>
        </div>
      ))}
    </Box>
  );
};
