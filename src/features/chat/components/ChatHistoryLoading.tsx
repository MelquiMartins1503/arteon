import { Box } from "@/components/Box";
import { Typography } from "@/components/Typography";

export const ChatHistoryLoading = () => {
  return (
    <Box
      flexDirection="col"
      alignItems="center"
      justifyContent="center"
      className="flex-1 w-full h-full"
    >
      <Box
        flexDirection="col"
        alignItems="center"
        gap={2}
        className="animate-pulse"
      >
        <Typography className="text-sm text-brand-600 dark:text-brand-400">
          Carregando histórico...
        </Typography>
      </Box>
    </Box>
  );
};
