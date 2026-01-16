import type { Metadata } from "next";
import prismaClient from "@/lib/prismaClient";
import { StoryClient } from "./StoryClient";

type Props = {
  params: Promise<{ uuid: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uuid } = await params;

  const story = await prismaClient.story.findUnique({
    where: { uuid },
    select: { title: true, description: true },
  });

  return {
    title: story?.title || "Nova História",
    description: story?.description || "Uma história interativa com IA.",
  };
}

export default async function StoryPage({ params }: Props) {
  const { uuid } = await params;

  return <StoryClient uuid={uuid} />;
}
