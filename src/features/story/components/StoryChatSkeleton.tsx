import { Box } from "@/components/ui/Box";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Story Chat Loading Skeleton
 * Displays while StoryChat component is loading
 */
export function StoryChatSkeleton() {
  return (
    <Box flexDirection="col" gap={4} className="w-full h-full p-6">
      {/* Header */}
      <Box alignItems="center" justifyContent="between" className="w-full">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </Box>

      {/* Messages */}
      <Box flexDirection="col" gap={4} className="flex-1 w-full">
        {/* Message 1 */}
        <Box gap={3} className="w-full">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Box flexDirection="col" gap={2} className="flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </Box>
        </Box>

        {/* Message 2 */}
        <Box gap={3} className="w-full" justifyContent="end">
          <Box flexDirection="col" gap={2} className="flex-1 max-w-[75%]">
            <Skeleton className="h-4 w-2/3 ml-auto" />
            <Skeleton className="h-4 w-full" />
          </Box>
          <Skeleton className="w-10 h-10 rounded-full" />
        </Box>

        {/* Message 3 */}
        <Box gap={3} className="w-full">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Box flexDirection="col" gap={2} className="flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </Box>
        </Box>
      </Box>

      {/* Input */}
      <Skeleton className="h-16 w-full rounded-full" />
    </Box>
  );
}
