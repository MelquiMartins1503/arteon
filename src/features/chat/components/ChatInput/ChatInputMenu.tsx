import {
  AlertCircle,
  Check,
  Database,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { useChatInputTags } from "./ChatInputTagsContext";

export const ChatInputMenu = () => {
  const {
    important,
    isMeta,
    generateSuggestions,
    toggleImportant,
    toggleIsMeta,
    toggleGenerateSuggestions,
  } = useChatInputTags();

  return (
    <Dropdown>
      <Dropdown.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="md"
          width="md"
          className="z-50 p-0"
        >
          <Settings2 size={20} strokeWidth={1.5} />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content align="start" side="top" className="w-[170px]">
        <Dropdown.Item
          closeOnClick={false}
          onClick={toggleImportant}
          justifyContent="between"
        >
          <Box alignItems="center" gap={2}>
            <AlertCircle size={16} />
            Importante
          </Box>
          {important && <Check size={16} strokeWidth={1.5} />}
        </Dropdown.Item>
        <Dropdown.Item
          closeOnClick={false}
          onClick={toggleIsMeta}
          justifyContent="between"
        >
          <Box alignItems="center" gap={2}>
            <Database size={16} />
            Consulta
          </Box>
          {isMeta && <Check size={16} strokeWidth={1.5} />}
        </Dropdown.Item>
        <Dropdown.Item
          closeOnClick={false}
          onClick={toggleGenerateSuggestions}
          justifyContent="between"
        >
          <Box alignItems="center" gap={2}>
            <Sparkles size={16} />
            Sugestões
          </Box>
          {generateSuggestions && <Check size={16} strokeWidth={1.5} />}
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  );
};
