"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowUp,
  Check,
  Database,
  Plus,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Box } from "@/components/ui/Box";
import Button from "@/components/ui/Button";
import DropdownMenu from "@/components/ui/DropdownMenu";
import Field from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { type ChatInputFormValues, chatInputSchema } from "../schemas";
import { ChatInputToggle } from "./ChatInputToggle";
import type { ChatInputProps } from "./types";

export const ChatInput = ({
  onSendMessage,
  isLoading,
  onStopGeneration,
  formId,
  onValidityChange,
}: ChatInputProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isValid },
  } = useForm<ChatInputFormValues>({
    resolver: zodResolver(chatInputSchema),
    defaultValues: {
      content: "",
      important: false,
      isMeta: false,
      generateSuggestions: false,
    },
    mode: "onChange",
  });

  const content = watch("content");
  const important = watch("important");
  const isMeta = watch("isMeta");
  const generateSuggestions = watch("generateSuggestions");

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Notify parent about validity changes
  useEffect(() => {
    if (onValidityChange) {
      const hasContent = !!content?.trim();
      onValidityChange(isValid && hasContent);
    }
  }, [isValid, content, onValidityChange]);

  const onSubmit = (data: ChatInputFormValues) => {
    if (isLoading) return;

    onSendMessage(data.content, {
      important: data.important,
      isMeta: data.isMeta,
      generateSuggestions: data.generateSuggestions,
    });
    reset({
      content: "",
      important: false,
      isMeta: false,
      generateSuggestions: false,
    });
  };

  const handleStop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onStopGeneration) {
      onStopGeneration();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <Box
      alignItems="end"
      justifyContent="end"
      className="z-50 min-h-26.5 max-h-58.5 h-auto rounded-4xl w-full"
    >
      <Box
        alignItems="center"
        flexDirection="col"
        className={cn(
          "relative gap-2 p-2 w-full rounded-4xl shadow-[0px_-24px_24px_-4px_rgba(255,255,255,0.90)] dark:shadow-[0px_-24px_24px_-4px_rgba(20,20,20,0.90)]",
          "surface-brand-100 ",
        )}
      >
        <form
          id={formId}
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col w-full h-full"
        >
          <Field.Root className="relative flex-1 p-2">
            <Field.TextAreaWrapper variant="minimal" minRows={1} maxRows={6}>
              <Field.TextAreaInput
                {...register("content")}
                placeholder="Digite aqui..."
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <Field.TextAreaExpandButton className="top-1 right-1" />
            </Field.TextAreaWrapper>
          </Field.Root>

          <Box alignItems="center" justifyContent="between" className="w-full">
            <Box alignItems="center" gap={2}>
              <DropdownMenu>
                <DropdownMenu.Trigger asChild>
                  <Button
                    variant="ghost"
                    size="md"
                    width="md"
                    className="p-0"
                    type="button"
                    disabled={isLoading}
                  >
                    <Plus />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="start" className="min-w-56 p-2">
                  <DropdownMenu.Item
                    onSelect={() => setValue("important", !important)}
                  >
                    <AlertCircle className="mr-2 w-4 h-4" />
                    Importante
                    {important && <Check className="ml-auto w-4 h-4" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => setValue("isMeta", !isMeta)}
                  >
                    <Database className="mr-2 w-4 h-4" />
                    Consulta
                    {isMeta && <Check className="ml-auto w-4 h-4" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() =>
                      setValue("generateSuggestions", !generateSuggestions)
                    }
                  >
                    <Sparkles className="mr-2 w-4 h-4" />
                    Sugestões
                    {generateSuggestions && (
                      <Check className="ml-auto w-4 h-4" />
                    )}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu>

              <Box alignItems="center" gap={1}>
                {important && (
                  <ChatInputToggle
                    label="Importante"
                    icon={AlertCircle}
                    checked={true}
                    onChange={() => setValue("important", false)}
                    disabled={isLoading}
                  />
                )}

                {isMeta && (
                  <ChatInputToggle
                    label="Consulta"
                    icon={Database}
                    checked={true}
                    onChange={() => setValue("isMeta", false)}
                    disabled={isLoading}
                  />
                )}

                {generateSuggestions && (
                  <ChatInputToggle
                    label="Sugestões"
                    icon={Sparkles}
                    checked={true}
                    onChange={() => setValue("generateSuggestions", false)}
                    disabled={isLoading}
                  />
                )}
              </Box>
            </Box>

            {isLoading && onStopGeneration ? (
              <Button size="md" width="md" onClick={handleStop} type="button">
                <div className="h-4 min-w-4 dark:bg-brand-975 bg-brand-50" />
              </Button>
            ) : (
              <Button
                size="md"
                width="md"
                className="p-0"
                type="submit"
                disabled={!isValid || !content.trim() || isLoading}
              >
                <ArrowUp />
              </Button>
            )}
          </Box>
        </form>
      </Box>
    </Box>
  );
};
