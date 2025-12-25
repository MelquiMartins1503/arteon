"use client";

import { Ellipsis, Trash } from "lucide-react";
import Link from "next/link";
import { Box } from "@/components/ui/Box";
import Button from "@/components/ui/Button";
import DropdownMenu from "@/components/ui/DropdownMenu";
import Typography from "@/components/ui/Typography";

interface Story {
  id: number;
  title: string | null;
  description: string | null;
  updatedAt: Date | string;
}

interface StoryCardProps {
  story: Story;
  onDelete?: (id: number) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, onDelete }) => {
  return (
    <Box
      as="article"
      gap={2}
      flexDirection="col"
      className="group w-full h-40 bg-brand-200 dark:bg-brand-950 p-6 rounded-3xl"
    >
      <Box as="header" alignItems="center" justifyContent="between">
        <Link href={`/stories/${story.id}`} className="hover:underline">
          <Typography as="h3" size="2xl" weight="medium" className="truncate">
            {story.title || "Sem título"}
          </Typography>
        </Link>

        {/* Prevent link click when clicking dropdown */}
        <Box className="z-10">
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 transition-opacity group-hover:opacity-100 focus:ring-0! focus:ring-offset-0!"
                aria-label="Opções da história"
                title="Mais opções"
              >
                <Ellipsis size={16} aria-hidden="true" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" side="bottom">
              <DropdownMenu.Item
                onClick={() => onDelete?.(story.id)}
                className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                <Trash size={16} className="mr-2" />
                Excluir
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Box>
      </Box>

      <Link href={`/stories/${story.id}`} className="flex-1">
        <Typography
          as="p"
          size="lg"
          className="text-brand-700 dark:text-brand-500 line-clamp-2"
        >
          {story.description ||
            "Sem descrição disponível Sem descrição disponívelSem descrição disponívelSem descrição disponívelSem descrição disponívelSem descrição disponívelSem descrição disponívelSem descrição disponívelSem descrição disponível."}
        </Typography>
      </Link>
    </Box>
  );
};
