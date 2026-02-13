import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  CircleQuestionMark,
  Moon,
  Settings2,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/Avatar";
import { Box } from "@/components/Box";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { iconAnimation } from "@/components/layout/Sidebar/_components/Header";
import Separator from "@/components/Separador";
import { Typography } from "@/components/Typography";
import { cn } from "@/lib/cn";
import { NextThemeTrigger } from "@/providers/NextThemeProvider";

interface FooterProps {
  isCollapsed: boolean;
}

export function Footer({ isCollapsed }: FooterProps) {
  const { theme } = useTheme();

  return (
    <Box flexDirection="col" className="w-full">
      <Box gap={2} flexDirection="col" className="w-full">
        <Button
          variant="ghost"
          leftIcon={
            <motion.div {...iconAnimation}>
              <Settings2 size={22} strokeWidth={1.5} />
            </motion.div>
          }
          justifyContent="start"
          width="full"
          rounded="2xl"
          className={cn(
            "transform transition-transform",
            isCollapsed ? "pl-3.5" : "pl-3",
          )}
        >
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                transition={{
                  duration: 0.2,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{ originX: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Preferências
              </motion.span>
            )}
          </AnimatePresence>
        </Button>

        <NextThemeTrigger>
          <Button
            variant="ghost"
            leftIcon={
              <motion.div {...iconAnimation}>
                {theme === "dark" ? (
                  <Sun size={22} strokeWidth={1.5} />
                ) : (
                  <Moon size={22} strokeWidth={1.5} />
                )}
              </motion.div>
            }
            justifyContent="start"
            width="full"
            rounded="2xl"
            className={cn(
              "transform transition-transform",
              isCollapsed ? "pl-3.5" : "pl-3",
            )}
          >
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  style={{ originX: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </NextThemeTrigger>

        <Button
          variant="ghost"
          leftIcon={
            <motion.div {...iconAnimation}>
              <CircleQuestionMark size={22} strokeWidth={1.5} />
            </motion.div>
          }
          justifyContent="start"
          width="full"
          rounded="2xl"
          className={cn(
            "transform transition-transform",
            isCollapsed ? "pl-3.5" : "pl-3",
          )}
        >
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                transition={{
                  duration: 0.2,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{ originX: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Ajuda
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </Box>

      <Separator />

      <Dropdown>
        <Dropdown.Trigger asChild className="w-full">
          <Button
            variant={isCollapsed ? "none" : "ghost"}
            justifyContent="between"
            size={isCollapsed ? "fit" : "xl"}
            width="full"
            rounded="2xl"
            className={cn(isCollapsed ? "p-0" : "pl-3")}
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback className="bg-brand-200 dark:bg-brand-800">
                U
              </AvatarFallback>
            </Avatar>

            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <Box
                  as={motion.div}
                  flexDirection="row"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  style={{ originX: 0 }}
                  justifyContent="around"
                  alignItems="center"
                  className="overflow-hidden w-full"
                >
                  <Box gap={0} flexDirection="col">
                    <Typography weight="medium" whitespace="nowrap">
                      Melqui Martins
                    </Typography>
                    <Typography
                      size="sm"
                      whitespace="nowrap"
                      className="text-brand-600 dark:text-brand-400"
                    >
                      Plano Gratuito
                    </Typography>
                  </Box>

                  <ChevronRight size={22} strokeWidth={1.5} />
                </Box>
              )}
            </AnimatePresence>
          </Button>
        </Dropdown.Trigger>

        <Dropdown.Content side="right" align="end" offset={3.5}>
          <Dropdown.Item>Sair</Dropdown.Item>
        </Dropdown.Content>
      </Dropdown>
    </Box>
  );
}
