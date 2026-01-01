import { Avatar, AvatarFallback, AvatarImage } from "@/components/Avatar";
import { Typography } from "@/components/Typography";
import { cn } from "@/lib/cn";

interface ChatAvatarProps {
  label?: string;
  className?: string;
}

export const ChatAvatar = ({ label, className }: ChatAvatarProps) => {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {/* Placeholder image, can be replaced with a real URL if available */}
      <AvatarImage src="" alt={label || "AI Agent"} />
      <AvatarFallback className="bg-brand-200 dark:bg-brand-800">
        <Typography size="xs" weight="bold">
          IA
        </Typography>
      </AvatarFallback>
    </Avatar>
  );
};
