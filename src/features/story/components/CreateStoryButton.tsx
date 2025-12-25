"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Button from "@/components/ui/Button";
import apiClient from "@/lib/apiClient";

const CreateStoryButton: React.FC = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCreateStory = () => {
    startTransition(async () => {
      try {
        const response = await apiClient.post<{ id: number }>("/stories");
        router.push(`/stories/${response.data.id}`);
        router.refresh();
      } catch (error) {
        console.error("Failed to create story:", error);
      }
    });
  };

  return (
    <Button
      variant="primary"
      justifyContent="start"
      isLoading={isPending}
      onClick={handleCreateStory}
    >
      <Plus strokeWidth={1.5} />
      Nova história
    </Button>
  );
};

export default CreateStoryButton;
