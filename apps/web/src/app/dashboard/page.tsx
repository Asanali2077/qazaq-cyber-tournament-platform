"use client";

import Link from "next/link";
import { useMemo, useEffect, useState, type ComponentType } from "react";
import { BarChart3, Trophy, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { DashboardData, Team } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<"create" | "join" | null>(null);
  const [createTeam, setCreateTeam] = useState({ name: "", logoUrl: "" });
  const [inviteCode, setInviteCode] = useState("");

  const load = async () => {
    try {
      const [dashboardPayload, teamsPayload] = await Promise.all([
        apiFetch<DashboardData>("/dashboard"),
        apiFetch<{ teams: Team[] }>("/teams/my")
      ]);
      setDashboard(dashboardPayload);
      setTeams(teamsPayload.teams);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activitySeries = useMemo(
    () =>
      (dashboard?.activeTournaments ?? []).map((tournament) => ({
        id: tournament.id,
        label: tournament.name,
        value: tournament.participantCount
      })),
    [dashboard?.activeTournaments]
  );

  return (
    <PageShell>
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="space-y-3">
                <Badge variant="cyan">{user?.role ?? "PLAYER"} Dashboard</Badge>
                <div>
                  <h1 className="font-display text-3xl uppercase tracking-[0.12em] text-white md:text-4xl">
                    Operations at a glance
                  </h1>
                  <p className="mt-3 max-w-2xl text-slate-300">
                    Track tournament momentum, watch match activity, and keep your team ready for the next round.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <Link href="/tournaments">Open tournament catalog</Link>
                </Button>
                <Button asChild>
                  <Link href="/admin">Open admin console</Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardTitle>Team Console</CardTitle>
            <CardDescription>
              Create your roster, share invite codes, or join a teammate instantly.
            </CardDescription>
            <div className="space-y-3">
              <Input
                placeholder="Team name"
                value={createTeam.name}
                onChange={(event) =>
                  setCreateTeam((current) => ({ ...current, name: event.target.value }))
                }
              />
              <Input
                placeholder="Logo URL (optional)"
                value={createTeam.logoUrl}
                onChange={(event) =>
                  setCreateTeam((current) => ({ ...current, logoUrl: event.target.value }))
                }
              />
              <Button
                className="w-full"
                disabled={submittingAction === "create"}
                onClick={async () => {
                  if (!createTeam.name.trim()) {
                    toast.error("Team name is required");
                    return;
                  }
                  try {
                    setSubmittingAction("create");
                    await apiFetch("/teams", {
                      method: "POST",
                      body: JSON.stringify(createTeam)
                    });
                    toast.success("Team created");
                    setCreateTeam({ name: "", logoUrl: "" });
                    await load();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to create team");
                  } finally {
                    setSubmittingAction(null);
                  }
                }}
              >
                {submittingAction === "create" ? "Creating team..." : "Create Team"}
              </Button>
            </div>
            <div className="h-px bg-white/10" />
            <div className="space-y-3">
              <Input
                placeholder="Invite code"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              />
              <Button
                variant="secondary"
                className="w-full"
                disabled={submittingAction === "join"}
                onClick={async () => {
                  if (!inviteCode.trim()) {
                    toast.error("Enter an invite code first");
                    return;
                  }
                  try {
                    setSubmittingAction("join");
                    await apiFetch("/teams/join", {
                      method: "POST",
                      body: JSON.stringify({ inviteCode })
                    });
                    toast.success("Joined team");
                    setInviteCode("");
                    await load();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to join team");
                  } finally {
                    setSubmittingAction(null);
                  }
                }}
              >
                {submittingAction === "join" ? "Joining..." : "Join via Code"}
              </Button>
            </div>
          </Card>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <AnalyticsCard
            icon={Trophy}
            label="Total Tournaments"
            value={String(dashboard?.analytics.totalTournaments ?? 0)}
            accent="cyan"
          />
          <AnalyticsCard
            icon={Zap}
            label="Active Matches"
            value={String(dashboard?.analytics.activeMatches ?? 0)}
            accent="amber"
          />
          <AnalyticsCard
            icon={Users}
            label="Registered Teams"
            value={String(dashboard?.analytics.registeredTeams ?? 0)}
            accent="violet"
          />
          <AnalyticsCard
            icon={BarChart3}
            label="Completion Rate"
            value={`${dashboard?.analytics.completionRate ?? 0}%`}
            accent="green"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <CardTitle>Activity Pulse</CardTitle>
                <CardDescription className="mt-1">
                  Active tournament participation at a glance.
                </CardDescription>
              </div>
            </div>
            {activitySeries.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                No tournament activity yet. Create a tournament in the admin panel to light this up.
              </div>
            ) : (
              <div className="space-y-4">
                {activitySeries.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="text-slate-500">{item.value} teams</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            12,
                            (item.value /
                              Math.max(...activitySeries.map((entry) => entry.value), 1)) *
                              100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Live Tournament Feed</CardTitle>
                <CardDescription className="mt-2">
                  Status, format, and progress across active tournaments.
                </CardDescription>
              </div>
              {dashboard?.mvp ? <Badge variant="amber">MVP {dashboard.mvp.teamName}</Badge> : null}
            </div>
            {(dashboard?.activeTournaments ?? []).length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                No active tournaments yet. Generate a bracket or open registration to surface activity here.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(dashboard?.activeTournaments ?? []).map((tournament) => (
                  <Card key={tournament.id} className="border-white/10 bg-slate-950/55 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                      {tournament.game}
                    </p>
                    <CardTitle className="mt-3">{tournament.name}</CardTitle>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="violet">{tournament.format.replace("_", " ")}</Badge>
                      <Badge variant={tournament.status === "LIVE" ? "green" : "amber"}>
                        {tournament.status}
                      </Badge>
                    </div>
                    <p className="mt-4 text-sm text-slate-400">
                      {tournament.participantCount} registered teams, {tournament.completedMatches} completed matches.
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-5">
            <div>
              <CardTitle>My Team</CardTitle>
              <CardDescription className="mt-2">
                Invite code and roster details for your current squad.
              </CardDescription>
            </div>
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                Loading team workspace...
              </div>
            ) : teams.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                No teams yet. Create a team or join with an invite code to unlock tournament registration.
              </div>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-[24px] border border-white/10 bg-slate-950/50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg uppercase tracking-[0.16em] text-white">
                        {team.name}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Captain: {team.captainName ?? "Unknown"}
                      </p>
                    </div>
                    <Badge variant="amber">Invite {team.inviteCode}</Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    {team.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"
                      >
                        <span className="text-sm text-slate-200">{member.name}</span>
                        {member.isCaptain ? <Badge variant="cyan">Captain</Badge> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </Card>

          <div className="space-y-6">
            <Card className="space-y-4">
              <div>
                <CardTitle>Upcoming Matches</CardTitle>
                <CardDescription className="mt-2">
                  Ready matches for your role and roster.
                </CardDescription>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="rounded-[24px] border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                    Loading upcoming matches...
                  </div>
                ) : null}
                {(dashboard?.upcomingMatches ?? []).map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-slate-950/50 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {match.teamA?.name ?? "TBD"} vs {match.teamB?.name ?? "TBD"}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {match.tournamentName} - Round {match.round}
                      </p>
                    </div>
                    <Badge variant={match.status === "READY" ? "cyan" : "amber"}>
                      {match.status}
                    </Badge>
                  </div>
                ))}
                {!loading && dashboard?.upcomingMatches.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                    No matches yet. Once the bracket is live, upcoming fixtures will surface here.
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription className="mt-2">
                  Team ranking by wins and total completed matches.
                </CardDescription>
              </div>
              <div className="space-y-3">
                {(dashboard?.leaderboard ?? []).map((entry, index) => (
                  <div
                    key={entry.teamId}
                    className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-950/50 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm text-slate-500">#{index + 1}</p>
                      <p className="font-medium text-white">{entry.teamName}</p>
                    </div>
                    <div className="text-right text-sm text-slate-300">
                      <p>{entry.wins} wins</p>
                      <p className="text-slate-500">{entry.matchesPlayed} played</p>
                    </div>
                  </div>
                ))}
                {!loading && dashboard?.leaderboard.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                    No leaderboard yet. Completed results will populate team standings automatically.
                  </div>
                ) : null}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function AnalyticsCard({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: "cyan" | "amber" | "violet" | "green";
}) {
  const accentClasses = {
    cyan: "border-cyan-400/20 bg-cyan-400/8 text-cyan-200",
    amber: "border-amber-400/20 bg-amber-400/8 text-amber-200",
    violet: "border-indigo-400/20 bg-indigo-400/8 text-indigo-200",
    green: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200"
  };

  return (
    <Card className="space-y-4">
      <div
        className={`flex size-11 items-center justify-center rounded-2xl border ${accentClasses[accent]}`}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <p className="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-white">
          {value}
        </p>
      </div>
    </Card>
  );
}
