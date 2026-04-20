"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Crown, LogOut, Shield, Swords, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" }
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 shadow-neon">
            <Trophy className="size-5" />
          </div>
          <div>
            <p className="font-display text-sm uppercase tracking-[0.35em] text-cyan-300">
              Qazaq Cyber
            </p>
            <p className="text-sm text-slate-400">Tournament Platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white",
                  active && "bg-white/10 text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Badge variant={user.role === "ADMIN" ? "rose" : user.role === "ORGANIZER" ? "violet" : "cyan"}>
                {user.role}
              </Badge>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    await logout();
                    router.push("/");
                    toast.success("Signed out successfully");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Unable to sign out"
                    );
                  }
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">
                  <Swords className="size-4" />
                  Login
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">
                  <Shield className="size-4" />
                  Join
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="container flex gap-2 overflow-x-auto pb-4 md:hidden">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300",
                active && "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
