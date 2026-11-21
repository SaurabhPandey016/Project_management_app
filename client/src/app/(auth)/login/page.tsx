"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TryDemoButton } from "@/components/common/TryDemoButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StatusGate } from "@/components/common/StatusGate";
import { useAuth } from "@/hooks/useAuth";
import { useServiceStatus } from "@/providers/ServiceStatusProvider";
import { ApiError } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { status } = useServiceStatus();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    form.clearErrors("root.server");
    try {
      await login(values.email.trim().toLowerCase(), values.password);
      toast.success("Welcome back");
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 401
          ? "Invalid email or password"
          : error instanceof ApiError && error.status === 409
            ? "An account with this email already exists"
            : error instanceof Error
              ? error.message
              : "Unable to sign in";
      if (error instanceof ApiError && error.status === 409) {
        form.setError("email", { type: "server", message });
      } else {
        form.setError("root.server", { type: "server", message });
      }
      toast.error(message);
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 py-8 lg:grid-cols-[1fr_0.9fr] lg:py-12">
      <div className="hidden max-w-lg lg:block">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-300">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Your workspace, in sync
        </div>
        <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
          Make room for
          <span className="block bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
            meaningful work.
          </span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
          Pick up right where your team left off. Your projects, priorities,
          and conversations are waiting.
        </p>
      </div>

      <StatusGate>
        <Card className="mx-auto w-full max-w-md border-white/10 bg-card/80 shadow-2xl shadow-black/20 backdrop-blur">
        <CardHeader className="space-y-2 pb-5">
          <p className="text-sm font-medium text-indigo-300">Welcome back</p>
          <CardTitle className="text-2xl">Sign in to IssueFlow</CardTitle>
          <CardDescription>
            Use your account email and password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <FormItem>
                <FormLabel htmlFor="email">Email address</FormLabel>
                <FormControl>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby={
                      form.formState.errors.email ? "email-error" : undefined
                    }
                    {...form.register("email")}
                  />
                </FormControl>
                <FormMessage id="email-error">
                  {form.formState.errors.email?.message}
                </FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="password">Password</FormLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pr-11"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={
                      form.formState.errors.password
                        ? "password-error"
                        : undefined
                    }
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="size-4" />
                    ) : (
                      <Eye aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </div>
                <FormMessage id="password-error">
                  {form.formState.errors.password?.message}
                </FormMessage>
              </FormItem>

              {form.formState.errors.root?.server?.message && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {form.formState.errors.root.server.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400"
                disabled={form.formState.isSubmitting || status !== "live"}
              >
                {status !== "live"
                  ? "Waiting for the server"
                  : form.formState.isSubmitting
                    ? "Signing in..."
                    : "Sign in"}
                {status === "live" && !form.formState.isSubmitting && (
                  <ArrowRight aria-hidden="true" className="ml-auto" />
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-3">
            <TryDemoButton
              variant="outline"
              className="h-11 w-full"
            />
          </div>
          <Alert className="mt-5 border-white/8 bg-background/40">
            <ShieldCheck aria-hidden="true" />
            <AlertDescription>
              Your session is protected with a secure, httpOnly cookie.
            </AlertDescription>
          </Alert>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to IssueFlow?{" "}
            <Link
              href="/register"
              className="font-medium text-indigo-300 underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </CardContent>
        </Card>
      </StatusGate>
    </section>
  );
}
