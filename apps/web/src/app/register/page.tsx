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
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["PLAYER", "ORGANIZER"])
});

type FormValues = z.infer<typeof schema>;
type PublicRole = FormValues["role"];

export default function RegisterPage() {
  const router = useRouter();
  const { setSessionUser, user, loading } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "PLAYER"
    }
  });

  const role = watch("role");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = await apiFetch<{ user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(values)
      });
      setSessionUser(payload.user);
      toast.success("Account created");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create account");
    }
  });

  return (
    <PageShell compact>
      <div className="mx-auto max-w-xl">
        <Card className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Create Access</p>
            <CardTitle className="mt-2">Join the platform</CardTitle>
            <CardDescription className="mt-2">
              Start as a player or organizer. Admin access is seeded for local demo data.
            </CardDescription>
          </div>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Name</label>
                <Input placeholder="Aruzhan K." {...register("name")} />
                {errors.name ? <p className="text-sm text-rose-300">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Email</label>
                <Input type="email" placeholder="player@qazaq.gg" {...register("email")} />
                {errors.email ? <p className="text-sm text-rose-300">{errors.email.message}</p> : null}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Password</label>
              <Input type="password" placeholder="Create a strong password" {...register("password")} />
              {errors.password ? (
                <p className="text-sm text-rose-300">{errors.password.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Role</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["PLAYER", "Compete and join teams"],
                  ["ORGANIZER", "Create and run tournaments"]
                ].map(([value, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue("role", value as PublicRole)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      role === value
                        ? "border-cyan-400/40 bg-cyan-400/10"
                        : "border-white/10 bg-slate-950/40"
                    }`}
                  >
                    <p className="font-display text-sm uppercase tracking-[0.18em] text-white">
                      {value}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">{description}</p>
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-slate-400">
            Already registered?{" "}
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </PageShell>
  );
}
