import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Database, Sparkles, X } from "lucide-react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { useChatInputTags } from "./ChatInputTagsContext";

export const ChatInputTags = () => {
  const {
    important,
    isMeta,
    generateSuggestions,
    toggleImportant,
    toggleIsMeta,
    toggleGenerateSuggestions,
  } = useChatInputTags();

  return (
    <Box alignItems="center" gap={1} className="max-md:hidden">
      <AnimatePresence>
        {important && (
          <motion.div
            layout
            key="important"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          >
            <Button
              type="button"
              variant="ghost-secondary"
              leftIcon={<AlertCircle size={16} />}
              rightIcon={<X size={16} strokeWidth={1.5} />}
              onClick={toggleImportant}
              selected={important}
            >
              Importante
            </Button>
          </motion.div>
        )}

        {isMeta && (
          <motion.div
            layout
            key="isMeta"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          >
            <Button
              type="button"
              variant="ghost-secondary"
              leftIcon={<Database size={16} />}
              rightIcon={<X size={16} strokeWidth={1.5} />}
              onClick={toggleIsMeta}
              selected={isMeta}
            >
              Consulta
            </Button>
          </motion.div>
        )}

        {generateSuggestions && (
          <motion.div
            layout
            key="generateSuggestions"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          >
            <Button
              type="button"
              variant="ghost-secondary"
              leftIcon={<Sparkles size={16} />}
              rightIcon={<X size={16} strokeWidth={1.5} />}
              onClick={toggleGenerateSuggestions}
              selected={generateSuggestions}
            >
              Sugestões
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};
