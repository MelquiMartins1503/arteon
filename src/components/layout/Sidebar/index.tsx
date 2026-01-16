"use client";

import { useEffect, useState } from "react";
import { getStories, type StorySidebarItem } from "@/features/story/actions";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { api } from "@/lib/api";
import logger from "@/lib/logger";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileSidebar } from "./MobileSidebar";
import { SidebarDialogs } from "./SidebarDialogs";
import type { SidebarProps } from "./types";

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [stories, setStories] = useState<StorySidebarItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<StorySidebarItem | null>(
    null,
  );
  const [storyToEdit, setStoryToEdit] = useState<{
    uuid: string;
    title: string | null;
    description: string | null;
    customPrompt: string | null;
  } | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  useEffect(() => {
    const fetchStories = async () => {
      const data = await getStories();
      setStories(data);
      setIsLoaded(true);
    };
    fetchStories();
  }, []);

  const handleEditStory = async (story: { uuid: string }) => {
    try {
      const data = await api.get<{
        title?: string;
        description?: string;
        customPrompt?: string;
      }>(`/stories/${story.uuid}/prompt`);
      setStoryToEdit({
        uuid: story.uuid,
        title: data.title || "",
        description: data.description || "",
        customPrompt: data.customPrompt || "",
      });
    } catch (error) {
      logger.error(
        { error, storyUuid: story.uuid },
        "Failed to fetch story for editing",
      );
    }
  };

  useEffect(() => {
    if (!isMobile) {
      setMobileOpen(false);
      setIsCollapsed(false);
    } else {
      setIsCollapsed(false);
    }
  }, [isMobile, setMobileOpen]);

  return (
    <>
      {isMobile ? (
        <MobileSidebar
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          stories={stories}
          setStories={setStories}
          isLoaded={isLoaded}
          setStoryToDelete={setStoryToDelete}
          setStoryToEdit={handleEditStory}
          setIsCreateStoryOpen={setIsCreateStoryOpen}
        />
      ) : (
        <DesktopSidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          stories={stories}
          setStories={setStories}
          isLoaded={isLoaded}
          setStoryToDelete={setStoryToDelete}
          setStoryToEdit={handleEditStory}
          setIsCreateStoryOpen={setIsCreateStoryOpen}
        />
      )}

      <SidebarDialogs
        storyToDelete={storyToDelete}
        setStoryToDelete={setStoryToDelete}
        storyToEdit={storyToEdit}
        setStoryToEdit={setStoryToEdit}
        isCreateStoryOpen={isCreateStoryOpen}
        setIsCreateStoryOpen={setIsCreateStoryOpen}
        stories={stories}
        setStories={setStories}
      />
    </>
  );
}
