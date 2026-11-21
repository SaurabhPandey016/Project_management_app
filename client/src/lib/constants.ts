import {
  Bug,
  CheckSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { IssuePriority, IssueType } from "@/types/domain";

export const priorityStyles: Record<IssuePriority, string> = {
  LOW: "border-slate-400/20 bg-slate-400/10 text-slate-400",
  MEDIUM: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  HIGH: "border-orange-400/20 bg-orange-400/10 text-orange-300",
  CRITICAL: "border-red-400/20 bg-red-400/10 text-red-300",
};

export const issueTypeIcons: Record<IssueType, LucideIcon> = {
  BUG: Bug,
  FEATURE: Sparkles,
  TASK: CheckSquare,
};
