"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Invitations", href: "/invitations", icon: Bell },
];

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, pendingInvitationCount, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      toast.success("You have been signed out");
      router.replace("/login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to sign out",
      );
    }
  }

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-background/80 backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex min-w-0 items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {navigation.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive(href)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                }`}
              >
                {label}
                {label === "Invitations" && pendingInvitationCount > 0 && (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-indigo-300">
                    {pendingInvitationCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {!isLoading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-10 gap-2 px-2 sm:px-3"
                    aria-label="Open account menu"
                  />
                }
              >
                <Avatar className="size-7">
                  <AvatarFallback
                    className="text-[0.65rem] font-semibold text-white"
                    style={{ backgroundColor: user.avatarColor }}
                  >
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-28 truncate text-sm sm:block">
                  {user.name}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="hidden size-3.5 text-muted-foreground sm:block"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{user.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href="/dashboard" />}
                >
                  <LayoutDashboard aria-hidden="true" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/invitations" />}
                >
                  <Bell aria-hidden="true" />
                  Invitations
                  {pendingInvitationCount > 0 && (
                    <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs text-indigo-300">
                      {pendingInvitationCount}
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => void handleLogout()}
                >
                  <LogOut aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !isLoading ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Button
                variant="ghost"
                nativeButton={false}
                role="link"
                render={<Link href="/login" />}
              >
                Sign in
              </Button>
              <Button
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400"
                nativeButton={false}
                role="link"
                render={<Link href="/register" />}
              >
                Get started
              </Button>
            </div>
          ) : (
            <span className="hidden size-9 animate-pulse rounded-full bg-muted sm:block" />
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu aria-hidden="true" className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(20rem,85vw)]">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {navigation.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                      isActive(href)
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                    {label === "Invitations" &&
                      pendingInvitationCount > 0 && (
                        <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs text-indigo-300">
                          {pendingInvitationCount}
                        </span>
                      )}
                  </Link>
                ))}
                {!isLoading && user ? (
                  <>
                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                      <Avatar className="size-9">
                        <AvatarFallback
                          className="text-xs font-semibold text-white"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="mt-2 justify-start"
                      onClick={() => {
                        setMobileOpen(false);
                        void handleLogout();
                      }}
                    >
                      <LogOut aria-hidden="true" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  !isLoading && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                      <Button
                        variant="outline"
                        nativeButton={false}
                        role="link"
                        render={<Link href="/login" />}
                        onClick={() => setMobileOpen(false)}
                      >
                        Sign in
                      </Button>
                      <Button
                        nativeButton={false}
                        role="link"
                        render={<Link href="/register" />}
                        onClick={() => setMobileOpen(false)}
                      >
                        Get started
                      </Button>
                    </div>
                  )
                )}
                {user && (
                  <p className="mt-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
                    <UserRound aria-hidden="true" className="size-3.5" />
                    Signed in to IssueFlow
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
