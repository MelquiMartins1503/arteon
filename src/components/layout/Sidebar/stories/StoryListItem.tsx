"use client";

import { motion } from "framer-motion";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { Button } from "@/components/Button";
import { Dropdown, useDropdown } from "@/components/Dropdown";
import { iconAnimation } from "@/components/layout/Sidebar/_components/Header";
import { Typography } from "@/components/Typography";
import type { StoryListItemProps } from "../types";

const StoryActionsButton: FC<{ story: StoryListItemProps["story"] }> = ({
  story,
}) => {
  const { isOpen } = useDropdown();

  return (
    <Button
      as="div"
      variant="ghost"
      size="sm"
      selected={isOpen}
      width="full"
      rounded="xl"
      justifyContent="between"
      className="pr-2 group"
    >
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0, scaleX: 0 }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{ originX: 0 }}
        className="flex overflow-hidden whitespace-nowrap w-full"
      >
        <Link href={`/stories/${story.uuid}`} className="w-full">
          <Typography size="sm" whitespace="nowrap">
            {story.title || "Sem Título"}
          </Typography>
        </Link>
      </motion.div>

      <Dropdown.Trigger asChild>
        <Button
          as="div"
          tabIndex={0}
          variant="none"
          size="icon-sm"
          className="opacity-0 group-hover:opacity-100"
        >
          <motion.div {...iconAnimation}>
            <EllipsisVertical size={20} strokeWidth={1.5} />
          </motion.div>
        </Button>
      </Dropdown.Trigger>
    </Button>
  );
};

export function StoryListItem({ story, onDelete, onEdit }: StoryListItemProps) {
  return (
    <Dropdown className="w-full">
      <StoryActionsButton story={story} />

      <Dropdown.Content side="right" align="start" offset={5}>
        <Dropdown.Item onClick={() => onEdit({ uuid: story.uuid })}>
          Editar
        </Dropdown.Item>
        <Dropdown.Item onClick={() => onDelete(story)}>Excluir</Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  );
}
