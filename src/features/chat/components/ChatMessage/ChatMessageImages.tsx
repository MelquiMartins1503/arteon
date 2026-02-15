import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { api } from "@/lib/api";
import logger from "@/lib/logger";

interface ChatMessageImagesProps {
  imageKeys: string[];
}

export const ChatMessageImages: React.FC<ChatMessageImagesProps> = ({
  imageKeys,
}) => {
  const [imageUrls, setImageUrls] = useState<(string | null)[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

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
    <>
      <Box
        gap={2}
        className="flex-wrap mt-2"
        style={{
          display: "grid",
          gridTemplateColumns:
            imageKeys.length === 1
              ? "1fr"
              : imageKeys.length === 2
                ? "repeat(2, 1fr)"
                : "repeat(3, 1fr)",
          maxWidth: "400px",
        }}
      >
        {imageKeys.map((key, index) => (
          <button
            key={key}
            type="button"
            className="relative rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-0 p-0"
            style={{
              maxHeight: "235px",
              maxWidth: "350px",
            }}
            onClick={() => setSelectedImage(index)}
            aria-label={`Ver imagem ${index + 1}`}
          >
            {imageUrls[index] ? (
              // biome-ignore lint/performance/noImgElement: Necessário para manter aspect ratio flexível com limites de max-width/height
              <img
                src={imageUrls[index] || ""}
                alt={`Imagem ${index + 1}`}
                style={{
                  maxHeight: "235px",
                  maxWidth: "350px",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <Box
                alignItems="center"
                justifyContent="center"
                className="w-full h-full"
              >
                <div className="animate-pulse text-xs text-brand-400">
                  Carregando...
                </div>
              </Box>
            )}
          </button>
        ))}
      </Box>

      {/* Lightbox/Modal for enlarged view */}
      <AnimatePresence>
        {selectedImage !== null && imageUrls[selectedImage] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4 border-0 cursor-pointer"
            onClick={() => setSelectedImage(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelectedImage(null);
            }}
            role="button"
            tabIndex={0}
            aria-label="Fechar visualização de imagem"
          >
            <Box
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Image
                  src={imageUrls[selectedImage] || ""}
                  alt={`Imagem ${selectedImage + 1}`}
                  width={2000}
                  height={2000}
                  quality={100}
                  unoptimized
                  className="max-w-full max-h-[90vh] object-contain rounded-2xl"
                  priority
                />
              </motion.div>
            </Box>
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4"
              aria-label="Fechar"
            >
              <X strokeWidth={1.5} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
