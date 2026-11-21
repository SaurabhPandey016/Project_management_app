"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bell, Check, Clock3, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-message";
import type { Invitation } from "@/types/domain";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function getErrorMessage(error: unknown): string {
  return getFriendlyErrorMessage(error, "Unable to load invitations");
}

export default function InvitationsPage() {
  const { refreshUser } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const loadInvitations = useCallback(() => {
    return api
      .get<Invitation[]>("/invitations/mine")
      .then(setInvitations)
      .catch((requestError: unknown) =>
        setError(getErrorMessage(requestError)),
      )
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  function retryLoadingInvitations() {
    setIsLoading(true);
    setError(null);
    void loadInvitations();
  }

  async function respond(invitationId: string, action: "accept" | "decline") {
    const previousInvitations = invitations;
    setInvitations((current) =>
      current.filter((invitation) => invitation.id !== invitationId),
    );
    setRespondingTo(invitationId);
    try {
      await api.post<void>(`/invitations/${invitationId}/${action}`);
      toast.success(
        action === "accept" ? "Invitation accepted" : "Invitation declined",
      );
      await Promise.all([loadInvitations(), refreshUser()]);
    } catch (requestError) {
      setInvitations(previousInvitations);
      toast.error(getErrorMessage(requestError));
    } finally {
      setRespondingTo(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div>
        <p className="text-sm font-medium text-indigo-300">Your inbox</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Invitations
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Review project invitations sent to your account.
        </p>
      </div>

      {isLoading ? (
        <div aria-label="Loading invitations" className="mt-7 space-y-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : error ? (
        <Card className="mt-7 border-red-400/20 bg-red-400/5">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-red-300"
              />
              <div>
                <p className="font-medium">Invitations couldn&apos;t be loaded</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={retryLoadingInvitations}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : invitations.length === 0 ? (
        <Card className="mt-7 border-dashed border-white/15 bg-card/35">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
              <Bell aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 font-semibold">You&apos;re all caught up</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              New project invitations will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-7 space-y-3">
          {invitations.map((invitation) => (
            <Card
              key={invitation.id}
              className="border-white/8 bg-card/55"
            >
              <CardContent className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
                    <Clock3 aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {invitation.project?.name ?? "Project invitation"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invitation.invitedBy?.name ?? "A teammate"} invited you
                      to join as a{" "}
                      <span className="font-medium text-foreground">
                        {invitation.role.toLowerCase()}
                      </span>
                      .
                    </p>
                    {invitation.project && (
                      <Badge variant="secondary" className="mt-2">
                        {invitation.project.key}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    disabled={respondingTo !== null}
                    onClick={() => void respond(invitation.id, "decline")}
                  >
                    <X aria-hidden="true" />
                    Decline
                  </Button>
                  <Button
                    className="bg-primary text-primary-foreground"
                    disabled={respondingTo !== null}
                    onClick={() => void respond(invitation.id, "accept")}
                  >
                    <Check aria-hidden="true" />
                    {respondingTo === invitation.id ? "Saving..." : "Accept"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Card className="mt-8 border-white/8 bg-card/35">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">A note about invitations</CardTitle>
          <CardDescription>
            Invitations are linked to your signed-in email address. If you
            expected one, make sure you&apos;re using the right account.
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}
