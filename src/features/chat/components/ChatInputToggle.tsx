import type { LucideIcon } from "lucide-react";
import type React from "react";
import Button from "@/components/ui/Button";

interface ChatInputToggleProps {
  label: string;
  icon: LucideIcon;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const ChatInputToggle: React.FC<ChatInputToggleProps> = ({
  label,
  icon: Icon,
  checked,
  onChange,
  disabled,
}) => {
  return (
    <Button
      type="button"
      variant="ghost"
      gap={2}
      size="sm"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      selected={checked}
    >
      <Icon size={16} strokeWidth={2} />
      {label}
    </Button>
  );
};
