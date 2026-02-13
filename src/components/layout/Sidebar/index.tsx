"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteStory,
  getStories,
  type StorySidebarItem,
} from "@/features/story/actions";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { api } from "@/lib/api";
import logger from "@/lib/logger";
import { CollapsibleSidebar } from "./_layouts/CollapsibleSidebar";
import { DrawerSidebar } from "./_layouts/DrawerSidebar";
import {
  CreateStoryDialog,
  DeleteStoryDialog,
  EditStoryDialog,
} from "./_modals";
import type { SidebarProps } from "./types";

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const handleDeleteStory = async () => {
    if (!storyToDelete) return;

    // Check if user is currently viewing this story
    const isOnStoryPage = pathname === `/stories/${storyToDelete.uuid}`;

    // Optimistic delete
    setStories((prev) => prev.filter((s) => s.uuid !== storyToDelete.uuid));
    setStoryToDelete(null); // Close modal

    await deleteStory(storyToDelete.uuid);

    // Redirect to home if user was viewing this story
    if (isOnStoryPage) {
      router.push("/");
    }
  };

  const handleCreateSuccess = (story: StorySidebarItem) => {
    setStories((prev) => [...prev, story]);
  };

  const handleEditSuccess = () => {
    // Optimistic update already handled in the form hook
    // Update stories list with the new title
    if (storyToEdit) {
      setStories((prev) =>
        prev.map((s) =>
          s.uuid === storyToEdit.uuid ? { ...s, title: storyToEdit.title } : s,
        ),
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
        <DrawerSidebar
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
        <CollapsibleSidebar
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

      <DeleteStoryDialog
        story={storyToDelete}
        onClose={() => setStoryToDelete(null)}
        onConfirm={handleDeleteStory}
      />

      <CreateStoryDialog
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <EditStoryDialog
        story={storyToEdit}
        onClose={() => setStoryToEdit(null)}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
