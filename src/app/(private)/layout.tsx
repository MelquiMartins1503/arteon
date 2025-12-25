import { Header } from "@/components/layout/Header";
import { Box } from "@/components/ui/Box";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      gap={0}
      alignItems="center"
      justifyContent="center"
      className="w-full h-full"
    >
      <Box
        as="main"
        alignItems="center"
        flexDirection="col"
        justifyContent="center"
        className="overflow-hidden w-10/12 h-full max-[1130px]:w-full"
      >
        <Header />

        <Box className="flex-1 w-full min-h-0 relative">{children}</Box>
      </Box>
    </Box>
  );
}
