"use client";

import type { NextPage } from "next";
import { Box } from "@/components/ui/Box";
import Separator from "@/components/ui/Separador";
import Typography from "@/components/ui/Typography";
import CreateStoryButton from "@/features/story/components/CreateStoryButton";
import { StoryGrid } from "@/features/story/components/StoryGrid";

const Page: NextPage = () => {
  return (
    <Box
      gap={8}
      flexDirection="col"
      justifyContent="start"
      className="py-8 w-full h-full"
    >
      <Box gap={0} flexDirection="col">
        <Typography as="h1" weight="medium">
          Bem-vindo de volta, Melqui!
        </Typography>

        <Typography
          as="p"
          size="xl"
          className="text-brand-700 dark:text-brand-500"
        >
          Onde a sua imaginação ganha vida. Continue suas jornadas ou comece a
          narrar um novo universo hoje mesmo.
        </Typography>
      </Box>

      <Box flexDirection="col" className="w-full">
        <Box alignItems="center" justifyContent="between" className="w-full">
          <Typography as="h2" size="3xl" weight="medium">
            Minhas histórias
          </Typography>

          <CreateStoryButton />
        </Box>

        <Separator />

        <StoryGrid />
      </Box>
    </Box>
  );
};

export default Page;
