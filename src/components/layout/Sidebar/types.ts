import type { StorySidebarItem } from "@/features/story/actions";

export interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export interface SidebarContextType {
  stories: StorySidebarItem[];
  setStories: (stories: StorySidebarItem[]) => void;
  isLoaded: boolean;
  setStoryToDelete: (story: StorySidebarItem | null) => void;
  setStoryToEdit: (
    story: {
      uuid: string;
      title: string | null;
      description: string | null;
      customPrompt: string | null;
    } | null,
  ) => void;
  setIsCreateStoryOpen: (open: boolean) => void;
  isCollapsed?: boolean;
}

export interface StoryListItemProps {
  story: StorySidebarItem;
  isMobile?: boolean;
  onDelete: (story: StorySidebarItem) => void;
  onEdit: (story: { uuid: string }) => void;
}
