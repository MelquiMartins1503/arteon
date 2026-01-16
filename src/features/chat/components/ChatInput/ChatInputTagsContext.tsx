import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

interface ChatInputTagsContextType {
  important: boolean;
  isMeta: boolean;
  generateSuggestions: boolean;
  toggleImportant: () => void;
  toggleIsMeta: () => void;
  toggleGenerateSuggestions: () => void;
  reset: () => void;
}

const ChatInputTagsContext = createContext<
  ChatInputTagsContextType | undefined
>(undefined);

export const useChatInputTags = () => {
  const context = useContext(ChatInputTagsContext);
  if (!context) {
    throw new Error(
      "useChatInputTags must be used within ChatInputTagsProvider",
    );
  }
  return context;
};

export const ChatInputTagsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [important, setImportant] = useState(false);
  const [isMeta, setIsMeta] = useState(false);
  const [generateSuggestions, setGenerateSuggestions] = useState(false);

  const toggleImportant = useCallback(() => {
    setImportant((prev) => !prev);
  }, []);

  const toggleIsMeta = useCallback(() => {
    setIsMeta((prev) => !prev);
  }, []);

  const toggleGenerateSuggestions = useCallback(() => {
    setGenerateSuggestions((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    setImportant(false);
    setIsMeta(false);
    setGenerateSuggestions(false);
  }, []);

  return (
    <ChatInputTagsContext.Provider
      value={{
        important,
        isMeta,
        generateSuggestions,
        toggleImportant,
        toggleIsMeta,
        toggleGenerateSuggestions,
        reset,
      }}
    >
      {children}
    </ChatInputTagsContext.Provider>
  );
};
