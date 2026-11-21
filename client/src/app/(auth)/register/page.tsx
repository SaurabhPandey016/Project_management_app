"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { useAuth } from "@/hooks/useAuth";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[a-zA-Z]/, "Include at least one letter")
    .regex(/[0-9]/, "Include at least one number"),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterValues) {
    try {
      await register(values.name, values.email, values.password);
      toast.success("Your account is ready");
      router.replace("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create account",
      );
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-8 lg:py-12">
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
                <FormControl>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={
                      form.formState.errors.password
                        ? "password-error"
                        : "password-hint"
                    }
                    {...form.register("password")}
                  />
                </FormControl>
                <p id="password-hint" className="text-xs text-muted-foreground">
                  Include at least one letter and one number.
                </p>
                <FormMessage id="password-error">
                  {form.formState.errors.password?.message}
                </FormMessage>
              </FormItem>

              <Button
                type="submit"
                className="h-11 w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting
                  ? "Creating account..."
                  : "Create account"}
                {!form.formState.isSubmitting && (
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
    </section>
  );
}
