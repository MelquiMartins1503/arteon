"use client";

import { motion } from "framer-motion";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { Typography } from "@/components/Typography";
import { cn } from "@/lib/cn";
import { iconAnimation } from "./SidebarHeader";
import type { StoryListItemProps } from "./types";

export function StoryListItem({
  story,
  isMobile = false,
  onDelete,
  onEdit,
}: StoryListItemProps) {
  const [isFocused, setIsFocused] = useState(false);
  if (isMobile) {
    return (
      <Button
        selected={isFocused}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        variant="ghost-secondary"
        size="sm"
        width="full"
        justifyContent="between"
        className="pr-2 group"
      >
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1], // Material Design easing
          }}
          style={{ originX: 0 }} // Scale from left
          className="overflow-hidden whitespace-nowrap"
        >
          <Link href={`/stories/${story.uuid}`}>
            <Typography size="sm" whitespace="nowrap">
              {story.title || "Sem Título"}
            </Typography>
          </Link>
        </motion.div>

        <Dropdown>
          <Dropdown.Trigger asChild>
            <Button
              as="div"
              tabIndex={0}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              selected
              variant="ghost-secondary"
              size="icon-sm"
              className={cn(
                `transition-opacity dark:bg-brand-800! bg-brand-200!`,
                isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <motion.div {...iconAnimation}>
                <EllipsisVertical size={20} strokeWidth={1.5} />
              </motion.div>
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item onClick={() => onEdit({ uuid: story.uuid })}>
              Editar
            </Dropdown.Item>
            <Dropdown.Item onClick={() => onDelete(story)}>
              Excluir
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown>
      </Button>
    );
  }

  // Desktop version
  return (
    <Button
      selected={isFocused}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      variant="ghost-secondary"
      size="sm"
      width="full"
      justifyContent="between"
      className="pr-2 group"
    >
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0, scaleX: 0 }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1], // Material Design easing
        }}
        style={{ originX: 0 }} // Scale from left
        className="overflow-hidden whitespace-nowrap"
      >
        <Link href={`/stories/${story.uuid}`}>
          <Typography size="sm" whitespace="nowrap">
            {story.title || "Sem Título"}
          </Typography>
        </Link>
      </motion.div>

      <Dropdown>
        <Dropdown.Trigger asChild>
          <Button
            as="div"
            tabIndex={0}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            selected
            variant="ghost-secondary"
            size="icon-sm"
            className={cn(
              `transition-opacity dark:bg-brand-800! bg-brand-200!`,
              isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            <motion.div {...iconAnimation}>
              <EllipsisVertical size={20} strokeWidth={1.5} />
            </motion.div>
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Item onClick={() => onEdit({ uuid: story.uuid })}>
            Editar
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onDelete(story)}>Excluir</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown>
    </Button>
  );
}
