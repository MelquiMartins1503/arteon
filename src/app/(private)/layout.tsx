"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/Avatar";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { PageTitle } from "@/components/layout/PageTitle";
import { Sidebar } from "@/components/layout/Sidebar";
import { NextThemeTrigger } from "@/providers/NextThemeProvider";

const iconAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring" as const, stiffness: 260, damping: 20 },
};

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box gap={0} className="overflow-hidden w-full h-full">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <Box as="main" gap={0} flexDirection="col" className="flex-1 h-full">
        <Box
          as="header"
          alignItems="center"
          justifyContent="between"
          className="px-6 w-full min-h-[74px]"
        >
          <Box alignItems="center" gap={3}>
            <Button
              variant="ghost"
              width="md"
              className="hidden p-0 max-[768px]:flex"
              onClick={() => setMobileOpen(true)}
            >
              <motion.div {...iconAnimation}>
                <Menu size={20} />
              </motion.div>
            </Button>

            <PageTitle />
          </Box>

          <Dropdown disableClickOutside>
            <Dropdown.Trigger asChild>
              <Button
                type="button"
                variant="ghost"
                rounded="full"
                width="fit"
                className="p-0"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt="@shadcn"
                  />
                  <AvatarFallback className="bg-brand-200 dark:bg-brand-800">
                    U
                  </AvatarFallback>
                </Avatar>
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Content className="w-48">
              <Dropdown.Item>
                <NextThemeTrigger />
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown>
        </Box>
        {children}
      </Box>
    </Box>
  );
}
