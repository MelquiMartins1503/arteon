import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StoryChat } from "@/features/story/components/StoryChat";
import { StoryChatSkeleton } from "@/features/story/components/StoryChatSkeleton";
import prismaClient from "@/lib/prismaClient";
import { getAuthenticatedUser } from "@/utils/getAuthenticatedUser";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  const storyId = Number(id);

  if (Number.isNaN(storyId)) {
    redirect("/dashboard");
  }

  const story = await prismaClient.story.findUnique({
    where: {
      id: storyId,
      userId: user.id,
    },
  });

  if (!story) {
    redirect("/dashboard");
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<StoryChatSkeleton />}>
        <StoryChat storyId={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
