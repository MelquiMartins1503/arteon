import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import type { BoxProps } from "@/components/ui/Box";
import { Box } from "@/components/ui/Box";

// import { cn } from "@/lib/cn"; // Removed as likely unused if we just use Box and Avatar

interface ChatAvatarProps extends BoxProps {
  label?: string;
  src?: string;
  alt?: string;
}

export const ChatAvatar = ({
  label = "AI",
  src,
  alt = "AI Assistant",
  className,
  ...props
}: ChatAvatarProps) => {
  return (
    <Box alignItems="center" gap={3} className={className} {...props}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={src} alt={alt} />
        <AvatarFallback className="text-xs bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300">
          {label}
        </AvatarFallback>
      </Avatar>
    </Box>
  );
};
