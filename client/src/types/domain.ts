export type ProjectRole = "OWNER" | "ADMIN" | "MEMBER";
export type IssueStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IssueType = "BUG" | "FEATURE" | "TASK";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  ownerId: string;
  issueCounter: number;
  role?: ProjectRole;
  memberCount?: number;
  openIssueCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  number: number;
  key: string;
  title: string;
  description: string | null;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  position: number;
  reporterId: string;
  assigneeId: string | null;
  reporter: User;
  assignee: User | null;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  parentId: string | null;
  content: string;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  author: User;
  replies: Comment[];
}

export interface Invitation {
  id: string;
  projectId: string;
  email: string;
  role: ProjectRole;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "REVOKED";
  createdAt: string;
  project?: Pick<Project, "id" | "name" | "key">;
  invitedBy?: Pick<User, "id" | "name" | "email">;
}
