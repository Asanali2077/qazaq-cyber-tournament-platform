"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/types";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setSessionUser, user, loading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = await apiFetch<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSessionUser(payload.user);
      toast.success("Welcome back");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in");
    }
  });

  return (
    <PageShell compact>
      <div className="mx-auto max-w-md">
        <Card className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Access Node</p>
            <CardTitle className="mt-2">Sign in to your arena</CardTitle>
            <CardDescription className="mt-2">
              Enter your credentials to manage teams, brackets, and live match flows.
            </CardDescription>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Email</label>
              <Input type="email" placeholder="captain@qazaq.gg" {...register("email")} />
              {errors.email ? <p className="text-sm text-rose-300">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Password</label>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              {errors.password ? (
                <p className="text-sm text-rose-300">{errors.password.message}</p>
              ) : null}
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-slate-400">
            Need an account?{" "}
            <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
              Create one
            </Link>
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
