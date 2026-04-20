"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { TournamentCard } from "@/lib/types";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentCard[]>([]);

  useEffect(() => {
    apiFetch<{ tournaments: TournamentCard[] }>("/tournaments")
      .then((payload) => setTournaments(payload.tournaments))
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Failed to load tournaments")
      );
  }, []);

  return (
    <PageShell>
      <div className="space-y-8">
        <div className="max-w-3xl space-y-3">
          <Badge variant="violet">Tournament Hub</Badge>
          <h1 className="font-display text-4xl uppercase tracking-[0.12em] text-white">
            Explore active and upcoming events
          </h1>
          <p className="text-lg text-slate-300">
            Review tournament formats, registration windows, and match progress before
            your team locks in.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="flex h-full flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="cyan">{tournament.game}</Badge>
                  <Badge variant="violet">{tournament.format.replaceAll("_", " ")}</Badge>
                  <Badge variant={tournament.status === "LIVE" ? "green" : "amber"}>
                    {tournament.status}
                  </Badge>
                </div>
                <div>
                  <CardTitle>{tournament.name}</CardTitle>
                  <CardDescription className="mt-3">
                    Organized by {tournament.organizer.name}. {tournament.approvedTeams} approved
                    teams and {tournament.completedMatches} completed matches.
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Starts
                    </p>
                    <p className="mt-2 text-sm text-slate-100">
                      {new Date(tournament.startDate).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Registration Closes
                    </p>
                    <p className="mt-2 text-sm text-slate-100">
                      {new Date(tournament.registrationClosesAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <Button asChild className="mt-6 w-full">
                <Link href={`/tournaments/${tournament.id}`}>Open Tournament</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
