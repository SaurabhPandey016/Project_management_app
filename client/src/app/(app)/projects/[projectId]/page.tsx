"use client";

import { useParams } from "next/navigation";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <ProjectWorkspace projectId={projectId} view="board" />;
}
