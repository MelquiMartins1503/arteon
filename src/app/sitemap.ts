import type { MetadataRoute } from "next";
import prismaClient from "@/lib/prismaClient";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await prismaClient.story.findMany({
    select: {
      uuid: true,
      updatedAt: true,
    },
    // Em um cenário real, filtraríamos por histórias públicas
    // where: { public: true }
  });

  const storyEntries: MetadataRoute.Sitemap = stories.map(
    (story: { uuid: string; updatedAt: Date }) => ({
      url: `${BASE_URL}/stories/${story.uuid}`,
      lastModified: story.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    }),
  );

  return [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...storyEntries,
  ];
}
