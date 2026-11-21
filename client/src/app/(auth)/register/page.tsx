"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register, user } = useAuth();
  const { status } = useServiceStatus();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    if (user !== null && !form.formState.isSubmitting) {
      router.replace("/dashboard");
    }
  }, [form.formState.isSubmitting, router, user]);

  async function onSubmit(values: RegisterValues) {
    form.clearErrors("root.server");
    try {
      await register(
        values.name.trim(),
        values.email.trim().toLowerCase(),
        values.password,
      );
      toast.success("Your account is ready");
      router.replace("/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 409
          ? "An account with this email already exists"
          : error instanceof Error
            ? error.message
            : "Unable to create account";
      if (error instanceof ApiError && error.status === 409) {
        form.setError("email", { type: "server", message });
      } else {
        form.setError("root.server", { type: "server", message });
      }
      toast.error(message);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-8 lg:py-12">
      <StatusGate>
        <Card className="w-full max-w-md border-white/10 bg-card/80 shadow-2xl shadow-black/20 backdrop-blur">
          <CardHeader className="space-y-2 pb-5">
            <p className="flex items-center gap-2 text-sm font-medium text-indigo-300">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Built for teams that ship
            </p>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>
              Bring your team&apos;s projects and priorities together.
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
                  <FormLabel htmlFor="name">Your name</FormLabel>
                  <FormControl>
                    <Input
                      id="name"
                      autoComplete="name"
                      placeholder="Alex Morgan"
                      aria-invalid={Boolean(form.formState.errors.name)}
                      aria-describedby={
                        form.formState.errors.name ? "name-error" : undefined
                      }
                      {...form.register("name")}
                    />
                  </FormControl>
                  <FormMessage id="name-error">
                    {form.formState.errors.name?.message}
                  </FormMessage>
                </FormItem>

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
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="pr-11"
                      aria-invalid={Boolean(form.formState.errors.password)}
                      aria-describedby={
                        form.formState.errors.password
                          ? "password-error"
                          : "password-hint"
                      }
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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
                  <p
                    id="password-hint"
                    className="text-xs text-muted-foreground"
                  >
                    Include at least one letter and one number.
                  </p>
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
                      ? "Creating account..."
                      : "Create account"}
                  {status === "live" && !form.formState.isSubmitting && (
                    <ArrowRight aria-hidden="true" className="ml-auto" />
                  )}
                </Button>
              </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-indigo-300 underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </StatusGate>
    </section>
  );
}
