"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Typography } from "@/components/Typography";
import { api } from "@/lib/api";
import logger from "@/lib/logger";

export function PageTitle() {
  const params = useParams();
  const [storyTitle, setStoryTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const storyUuid = params?.uuid as string | undefined;

  const fetchStoryTitle = useCallback(async () => {
    if (!storyUuid) {
      setStoryTitle(null);
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.get<{ title?: string }>(
        `/stories/${storyUuid}/prompt`,
      );
      setStoryTitle(data.title || "História sem título");
    } catch (error) {
      logger.error({ error, storyUuid }, "Failed to fetch story title");
      setStoryTitle(null);
    } finally {
      setIsLoading(false);
    }
  }, [storyUuid]);

  useEffect(() => {
    fetchStoryTitle();
  }, [fetchStoryTitle]);

  // Listen for story title updates
  useEffect(() => {
    const handleStoryUpdate = (event: CustomEvent) => {
      // If the updated story is the current one, refetch the title
      if (event.detail?.storyUuid === storyUuid) {
        fetchStoryTitle();
      }
    };

    window.addEventListener(
      "story-title-updated",
      handleStoryUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        "story-title-updated",
        handleStoryUpdate as EventListener,
      );
    };
  }, [fetchStoryTitle, storyUuid]);

  // Determine what to display
  const displayTitle = storyUuid && storyTitle ? storyTitle : "Início";

  return (
    <Typography size="2xl" weight="medium">
      {isLoading ? "Carregando..." : displayTitle}
    </Typography>
  );
}
