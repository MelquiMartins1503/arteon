"use client";

import Link from "next/link";
import { NextThemeTrigger } from "@/providers/NextThemeProvider";
import { Box } from "../ui/Box";
import DropdownMenu from "../ui/DropdownMenu";
import Typography from "../ui/Typography";

export const Header: React.FC = () => {
  return (
    <Box
      as="header"
      alignItems="center"
      justifyContent="between"
      className="w-full h-12"
    >
      <Link href="/">
        <Typography size="3xl" weight="medium">
          Arteon
        </Typography>
      </Link>

      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Box
            as="button"
            type="button"
            alignItems="center"
            justifyContent="center"
          >
            <Box className="rounded-full min-w-12 min-h-12 bg-brand-500"></Box>
          </Box>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          side="bottom"
          className="min-w-56 p-2"
          sideOffset={10}
        >
          <DropdownMenu.Item>
            <NextThemeTrigger />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </Box>
  );
};
