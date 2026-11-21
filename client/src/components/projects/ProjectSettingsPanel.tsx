"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  MailPlus,
  Shield,
  Trash2,
  UserMinus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import type { Invitation, Project, ProjectRole, User } from "@/types/domain";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export interface ProjectMember extends User {
  role: ProjectRole;
}

export interface ProjectWithMembers extends Project {
  members: ProjectMember[];
}

interface ProjectSettingsPanelProps {
  project: ProjectWithMembers;
  onUpdated: () => void;
  onDeleted: () => void;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ProjectSettingsPanel({
  project,
  onUpdated,
  onDeleted,
}: ProjectSettingsPanelProps) {
  const { user } = useAuth();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmMemberId, setConfirmMemberId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canEdit = project.role === "OWNER" || project.role === "ADMIN";
  const isOwner = project.role === "OWNER";
  const currentMember = useMemo(
    () => project.members.find((member) => member.id === user?.id),
    [project.members, user?.id],
  );

  useEffect(() => {
    let active = true;
    if (!canEdit) return () => { active = false; };

    api
      .get<Invitation[]>(`/projects/${project.id}/invitations`)
      .then((items) => {
        if (active) {
          setInvitations(items.filter((invitation) => invitation.status === "PENDING"));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          toast.error(
            getFriendlyErrorMessage(error, "Unable to load project invitations"),
          );
        }
      })
      .finally(() => {
        if (active) setLoadingInvitations(false);
      });

    return () => {
      active = false;
    };
  }, [canEdit, project.id]);

  async function saveProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("save-project");
    try {
      await api.patch<Project>(`/projects/${project.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      });
      toast.success("Project details updated");
      onUpdated();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Unable to update project"));
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteProject() {
    if (deleteConfirmation !== project.key) return;
    setPendingAction("delete-project");
    try {
      await api.delete<void>(`/projects/${project.id}`);
      toast.success("Project deleted");
      onDeleted();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Unable to delete project"));
      setPendingAction(null);
    }
  }

  async function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("invite");
    try {
      const invitation = await api.post<Invitation>(
        `/projects/${project.id}/invitations`,
        { email: inviteEmail.trim().toLowerCase(), role: inviteRole },
      );
      setInvitations((current) => [invitation, ...current]);
      setInviteEmail("");
      toast.success("Invitation sent");
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Unable to send invitation"));
    } finally {
      setPendingAction(null);
    }
  }

  async function changeRole(memberId: string, role: "ADMIN" | "MEMBER") {
    setPendingAction(`role-${memberId}`);
    try {
      await api.patch(`/projects/${project.id}/members/${memberId}`, { role });
      toast.success("Member role updated");
      onUpdated();
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Unable to update member role"));
    } finally {
      setPendingAction(null);
    }
  }

  async function removeMember(memberId: string) {
    setPendingAction(`remove-${memberId}`);
    try {
      await api.delete<void>(`/projects/${project.id}/members/${memberId}`);
      toast.success(memberId === user?.id ? "You left the project" : "Member removed");
      if (memberId === user?.id) {
        onDeleted();
      } else {
        setConfirmMemberId(null);
        onUpdated();
      }
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Unable to remove member"));
    } finally {
      setPendingAction(null);
    }
  }

  async function revokeInvitation(invitationId: string) {
    setPendingAction(`revoke-${invitationId}`);
    try {
      await api.delete<void>(
        `/projects/${project.id}/invitations/${invitationId}`,
      );
      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId),
      );
      toast.success("Invitation revoked");
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, "Unable to revoke invitation"));
    } finally {
      setPendingAction(null);
    }
  }

  const canRemoveMember = (member: ProjectMember) =>
    member.role !== "OWNER" &&
    (member.id === user?.id ||
      isOwner ||
      (project.role === "ADMIN" && member.role === "MEMBER"));

  return (
    <Tabs defaultValue="general" className="mt-6">
      <TabsList aria-label="Project settings sections" className="w-full sm:w-auto">
        <TabsTrigger value="general" className="gap-2">
          <Shield aria-hidden="true" />
          General
        </TabsTrigger>
        <TabsTrigger value="members" className="gap-2">
          <UsersRound aria-hidden="true" />
          Members
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-5 space-y-5">
        <Card className="border-white/8 bg-card/55">
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>
              {canEdit
                ? "Update the name and description teammates see."
                : "Only project owners and admins can edit these details."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void saveProject(event)} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="settings-project-name">Project name</Label>
                <Input
                  id="settings-project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  required
                  disabled={!canEdit || pendingAction !== null}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-project-description">Description</Label>
                <textarea
                  id="settings-project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  disabled={!canEdit || pendingAction !== null}
                  className="w-full resize-y rounded-lg border border-input bg-input/20 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                  placeholder="What is this project about?"
                />
              </div>
              {canEdit && (
                <Button type="submit" disabled={pendingAction !== null}>
                  {pendingAction === "save-project" && (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  )}
                  Save changes
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="border-red-400/20 bg-red-400/[0.03]">
            <CardHeader>
              <CardTitle className="text-red-200">Delete project</CardTitle>
              <CardDescription>
                This permanently deletes the project, its issues, and its conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You&apos;ll be asked to confirm the project key before anything is removed.
              </p>
              <Button
                type="button"
                variant="destructive"
                disabled={pendingAction !== null}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 aria-hidden="true" />
                Delete project
              </Button>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  if (pendingAction !== "delete-project") {
                    setDeleteDialogOpen(open);
                    if (!open) setDeleteConfirmation("");
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete {project.name}?</DialogTitle>
                    <DialogDescription>
                      This permanently deletes the project, its issues, and its
                      conversations. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Label htmlFor="delete-project-confirm">
                      Type <span className="font-semibold text-foreground">{project.key}</span> to confirm
                    </Label>
                    <Input
                      id="delete-project-confirm"
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      autoComplete="off"
                      disabled={pendingAction !== null}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pendingAction !== null}
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        deleteConfirmation !== project.key || pendingAction !== null
                      }
                      onClick={() => void deleteProject()}
                    >
                      {pendingAction === "delete-project" ? (
                        <LoaderCircle aria-hidden="true" className="animate-spin" />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                      Delete project
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="members" className="mt-5 space-y-5">
        <Card className="border-white/8 bg-card/55">
          <CardHeader>
            <CardTitle>Project members</CardTitle>
            <CardDescription>
              Manage access and roles for people in this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/70">
              {project.members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar aria-hidden="true">
                      <AvatarFallback
                        className="text-xs font-semibold text-white"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {member.name}
                        {member.id === user?.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && member.role !== "OWNER" ? (
                      <select
                        aria-label={`Role for ${member.name}`}
                        value={member.role}
                        disabled={pendingAction !== null}
                        onChange={(event) =>
                          void changeRole(
                            member.id,
                            event.target.value as "ADMIN" | "MEMBER",
                          )
                        }
                        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    ) : (
                      <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
                        {member.role.toLowerCase()}
                      </Badge>
                    )}
                    {canRemoveMember(member) && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingAction !== null}
                        onClick={() => {
                          if (confirmMemberId === member.id) {
                            void removeMember(member.id);
                          } else {
                            setConfirmMemberId(member.id);
                          }
                        }}
                        aria-label={
                          confirmMemberId === member.id
                            ? `Confirm removal of ${member.name}`
                            : member.id === user?.id
                              ? "Leave project"
                              : `Remove ${member.name}`
                        }
                      >
                        {pendingAction === `remove-${member.id}` ? (
                          <LoaderCircle aria-hidden="true" className="animate-spin" />
                        ) : (
                          <UserMinus aria-hidden="true" />
                        )}
                        {confirmMemberId === member.id
                          ? "Confirm"
                          : member.id === user?.id
                            ? "Leave"
                            : "Remove"}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {currentMember === undefined && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle aria-hidden="true" className="size-4" />
                Your membership is no longer active.
              </div>
            )}
          </CardContent>
        </Card>

        {canEdit && (
          <Card className="border-white/8 bg-card/55">
            <CardHeader>
              <CardTitle>Invite a teammate</CardTitle>
              <CardDescription>
                Send an invitation by email. They must accept it from their account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => void sendInvitation(event)}
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]"
              >
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    placeholder="teammate@company.com"
                    required
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    disabled={pendingAction !== null}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(event) =>
                      setInviteRole(event.target.value as "MEMBER" | "ADMIN")
                    }
                    disabled={pendingAction !== null}
                    className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={pendingAction !== null}>
                    {pendingAction === "invite" ? (
                      <LoaderCircle aria-hidden="true" className="animate-spin" />
                    ) : (
                      <MailPlus aria-hidden="true" />
                    )}
                    Invite
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="border-white/8 bg-card/55">
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              Invitations that have not yet been accepted or declined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canEdit ? (
              <p className="text-sm text-muted-foreground">
                Pending invitations are visible to project owners and admins.
              </p>
            ) : loadingInvitations ? (
              <p className="text-sm text-muted-foreground">Loading invitations…</p>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invitation.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Invited as {invitation.role.toLowerCase()}
                        {invitation.invitedBy
                          ? ` by ${invitation.invitedBy.name}`
                          : ""}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingAction !== null}
                        onClick={() => void revokeInvitation(invitation.id)}
                      >
                        {pendingAction === `revoke-${invitation.id}` ? (
                          <LoaderCircle aria-hidden="true" className="animate-spin" />
                        ) : (
                          <Trash2 aria-hidden="true" />
                        )}
                        Revoke
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
