import { CornerDownRight } from "lucide-react";
import { Box } from "@/components/ui/Box";
import Button from "@/components/ui/Button";

interface SuggestedPromptsProps {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
}

export const ChatSuggestedPrompts = ({
  prompts,
  onPromptClick,
}: SuggestedPromptsProps) => {
  return (
    <Box flexDirection="col" gap={2}>
      {prompts.map((prompt) => (
        <Button
          key={prompt}
          variant="ghost"
          justifyContent="start"
          onClick={() => onPromptClick(prompt)}
        >
          <CornerDownRight size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1 text-sm">{prompt}</span>
        </Button>
      ))}
    </Box>
  );
};
