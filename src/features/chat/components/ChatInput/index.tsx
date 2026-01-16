import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUp } from "lucide-react";
import { memo, useCallback, useEffect, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import Field from "@/components/Field";
import type { ChatInputFormValues } from "@/features/chat/schemas/chatInputSchema";
import { chatInputSchema } from "@/features/chat/schemas/chatInputSchema";
import type { ChatInputProps } from "../types";
import { ChatInputMenu } from "./ChatInputMenu";
import { ChatInputTags } from "./ChatInputTags";
import {
  ChatInputTagsProvider,
  useChatInputTags,
} from "./ChatInputTagsContext";

const ChatInputInner: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  formId,
  onValidityChange,
}) => {
  const [_isPending, startTransition] = useTransition();
  const {
    important,
    isMeta,
    generateSuggestions,
    reset: resetTags,
  } = useChatInputTags();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !isMobile &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      if (!isLoading) {
        handleSubmit(onSubmit)();
      }
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onStopGeneration) {
      onStopGeneration();
    }
  };

  const methods = useForm<ChatInputFormValues>({
    resolver: zodResolver(chatInputSchema),
    defaultValues: {
      content: "",
      important: false,
      isMeta: false,
      generateSuggestions: false,
    },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    formState: { isValid },
    reset,
    watch,
  } = methods;

  // Observar o conteúdo real do campo
  const contentValue = watch("content");

  // Botão desabilitado se campo vazio ou carregando
  const isButtonDisabled =
    !contentValue || contentValue.trim().length === 0 || isLoading;

  // Watch for validity changes
  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const onSubmit = useCallback(
    (data: ChatInputFormValues) => {
      // Reset form immediately to prevent double submission
      reset();
      resetTags();

      startTransition(async () => {
        // Use values from context instead of form
        onSendMessage(data.content, {
          important,
          isMeta,
          generateSuggestions,
        });
      });
    },
    [onSendMessage, reset, important, isMeta, generateSuggestions, resetTags],
  );

  return (
    <Box
      alignItems="end"
      justifyContent="end"
      className="w-full min-h-26.5 max-h-58.5 px-4 pb-4 h-auto shadow-[0px_-24px_18px_-4px_rgba(255,255,255,0.95)] dark:shadow-[0px_-24px_18px_-4px_rgba(27,27,27,0.95)]"
    >
      <FormProvider {...methods}>
        <Box
          as="form"
          id={formId}
          onSubmit={handleSubmit(onSubmit)}
          className="w-full"
        >
          <Field>
            <Field.Root className="relative">
              <Field.TextAreaWrapper
                gap={2}
                minRows={1}
                maxRows={6}
                expandedMaxRows={12}
                className="pr-5"
              >
                <Field.TextAreaInput
                  {...register("content")}
                  placeholder="Digite aqui..."
                  className="pr-7"
                  onKeyDown={handleKeyDown}
                />
                <Field.TextAreaExpandButton className="top-1 right-1" />
                <Box
                  alignItems="center"
                  justifyContent="between"
                  className="w-full"
                >
                  <Box alignItems="center" gap={2}>
                    <ChatInputMenu />
                    <ChatInputTags />
                  </Box>

                  {isLoading && onStopGeneration ? (
                    <Button
                      size="md"
                      width="md"
                      onClick={handleStop}
                      type="button"
                      aria-label="Parar geração de resposta"
                    >
                      <div className="h-4 min-w-4 dark:bg-brand-900 bg-brand-50" />
                    </Button>
                  ) : (
                    <Button
                      size="md"
                      width="md"
                      className="p-0"
                      type="submit"
                      disabled={isButtonDisabled}
                      aria-label="Enviar mensagem"
                    >
                      <ArrowUp />
                    </Button>
                  )}
                </Box>
              </Field.TextAreaWrapper>
            </Field.Root>
          </Field>
        </Box>
      </FormProvider>
    </Box>
  );
};

export const ChatInput: React.FC<ChatInputProps> = memo((props) => {
  return (
    <ChatInputTagsProvider>
      <ChatInputInner {...props} />
    </ChatInputTagsProvider>
  );
});

ChatInput.displayName = "ChatInput";
