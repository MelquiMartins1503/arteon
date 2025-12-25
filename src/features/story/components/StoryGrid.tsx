"use client";

import { useCallback, useEffect, useState } from "react";
import { Box } from "@/components/ui/Box";
import apiClient from "@/lib/apiClient";
import { StoryCard } from "./StoryCard";

interface Story {
  id: number;
  title: string | null;
  description: string | null;
  updatedAt: Date | string;
}

interface StoryGridProps {
  initialStories?: Story[];
}

export const StoryGrid: React.FC<StoryGridProps> = ({ initialStories }) => {
  const [stories, setStories] = useState<Story[]>(initialStories || []);
  const [loading, setLoading] = useState(!initialStories?.length);

  const fetchStories = useCallback(async () => {
    try {
      const response = await apiClient.get<Story[]>("/stories");
      setStories(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // If no initial stories provided, fetch them
  useEffect(() => {
    console.log("StoryGrid mount/useEffect", { initialStories });
    if (!initialStories) {
      console.log("Fetching stories...");
      fetchStories();
    } else {
      console.log("Using initial stories");
      setStories(initialStories); // Update if props change
      setLoading(false);
    }
  }, [initialStories, fetchStories]);

  const handleDelete = async (id: number) => {
    // Optimistic update would go here, or simple alert for now
    if (!confirm("Tem certeza que deseja excluir esta história?")) return;

    try {
      // Assuming a DELETE endpoint exists or will exist
      // await fetch(`/api/stories/${id}`, { method: 'DELETE' });
      // For now just update local state to simulate
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete story", error);
    }
  };

  if (loading) {
    return (
      <Box className="w-full h-32" justifyContent="center" alignItems="center">
        Carregando histórias...
      </Box>
    );
  }

  if (stories.length === 0) {
    return (
      <Box className="w-full p-8" justifyContent="center">
        <span className="text-brand-500">
          Você ainda não tem histórias. Crie uma nova para começar!
        </span>
      </Box>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} onDelete={handleDelete} />
      ))}
    </div>
  );
};
