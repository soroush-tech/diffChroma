"use client";

import { useParams } from "next/navigation";
import { Flex } from "@soroush.tech/design-system/Flex";
import { Main } from "@/components/chrome/Main";
import { ProjectRail } from "@/components/chrome/ProjectRail";
import { TOPBAR_HEIGHT } from "@/components/chrome/constants";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  return (
    <Flex flexDirection="row" alignItems="stretch" minHeight={`calc(100vh - ${TOPBAR_HEIGHT})`}>
      <ProjectRail projectId={id} />
      <Flex flexGrow={1} minWidth={0}>
        <Main>{children}</Main>
      </Flex>
    </Flex>
  );
}
