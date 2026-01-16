import type { NextPage } from "next";
import { Box } from "@/components/Box";

export const dynamic = "force-dynamic";

const Page: NextPage = () => {
  return <Box gap={0} className="overflow-hidden w-full h-full"></Box>;
};

export default Page;
