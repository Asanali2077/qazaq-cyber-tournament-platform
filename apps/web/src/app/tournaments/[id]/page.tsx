"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, Crown, Radio, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { BracketView } from "@/components/tournament/bracket-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { simulateTournamentTick } from "@/lib/tournament-demo";
import type { Team, TournamentDetails } from "@/lib/types";

type TournamentUpdateEvent = {
  tournamentId: string;
  type?:
    | "tournament_updated"
    | "match_result_updated"
    | "bracket_generated"
    | "participant_updated"
    | "tournament_reset";
};

const diffMatchIds = (current: TournamentDetails | null, next: TournamentDetails) => {
  if (!current) {
    return [];
  }

  const currentById = new Map(current.matches.map((match) => [match.id, match]));

  return next.matches
    .filter((match) => {
      const previous = currentById.get(match.id);

      if (!previous) {
        return true;
      }

      return (
        previous.scoreA !== match.scoreA ||
        previous.scoreB !== match.scoreB ||
        previous.winnerId !== match.winnerId ||
        previous.status !== match.status
      );
    })
    .map((match) => match.id);
};

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<TournamentDetails | null>(null);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [registeringTeamId, setRegisteringTeamId] = useState<string | null>(null);
  const [highlightedMatchIds, setHighlightedMatchIds] = useState<string[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncTournamentState = (
    nextTournament: TournamentDetails,
    options?: {
      notify?: TournamentUpdateEvent["type"] | "score_tick" | "match_live" | null;
      source?: "initial" | "socket" | "polling" | "demo" | "manual";
    }
  ) => {
    setTournament((current) => {
      const changedMatchIds = diffMatchIds(current, nextTournament);

      if (changedMatchIds.length > 0) {
        setHighlightedMatchIds(changedMatchIds);
      }

      if (
        options?.notify &&
        options.source !== "initial" &&
        (changedMatchIds.length > 0 ||
          options.notify === "bracket_generated" ||
          options.notify === "tournament_reset")
      ) {
        if (options.notify === "match_result_updated") {
          toast.success("Match result updated");
        } else if (options.notify === "bracket_generated") {
          toast.success("Bracket generated");
        } else if (options.notify === "tournament_reset") {
          toast.success("Tournament reset");
        } else if (options.notify === "match_live") {
          toast.message("Demo mode started a live match");
        }
      }

      return nextTournament;
    });
  };

  const loadTournament = async (
    source: "initial" | "socket" | "polling" | "manual" = "manual",
    eventType: TournamentUpdateEvent["type"] | null = null
  ) => {
    try {
      const payload = await apiFetch<{ tournament: TournamentDetails }>(
        `/tournaments/${params.id}`
      );
      syncTournamentState(payload.tournament, {
        notify: eventType,
        source
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tournament");
    } finally {
      setLoading(false);
    }
  };

  const loadMyTeams = async () => {
    if (!user) {
      setMyTeams([]);
      return;
    }

    try {
      const payload = await apiFetch<{ teams: Team[] }>("/teams/my");
      setMyTeams(payload.teams);
    } catch {
      setMyTeams([]);
    }
  };

  useEffect(() => {
    const stored = window.localStorage.getItem("qazaq-demo-mode");
    setDemoMode(stored === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("qazaq-demo-mode", demoMode ? "1" : "0");
  }, [demoMode]);

  useEffect(() => {
    void loadTournament("initial");
  }, [params.id]);

  useEffect(() => {
    void loadMyTeams();
  }, [user?.id]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("tournament:join", params.id);

    const handleConnect = () => {
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = () => {
      setSocketConnected(false);
    };

    const handleTournamentUpdate = (payload: TournamentUpdateEvent) => {
      if (payload.tournamentId === params.id && !demoMode) {
        void loadTournament("socket", payload.type ?? "tournament_updated");
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("tournament:updated", handleTournamentUpdate);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit("tournament:leave", params.id);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("tournament:updated", handleTournamentUpdate);
    };
  }, [demoMode, params.id]);

  useEffect(() => {
    if (demoMode || socketConnected) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadTournament("polling", "match_result_updated");
    }, 9000);

    return () => {
      window.clearInterval(interval);
    };
  }, [demoMode, socketConnected, params.id]);

  useEffect(() => {
    if (!demoMode || !tournament) {
      return;
    }

    const interval = window.setInterval(() => {
      setTournament((current) => {
        if (!current) {
          return current;
        }

        const result = simulateTournamentTick(current);

        if (result.changedMatchIds.length > 0) {
          setHighlightedMatchIds(result.changedMatchIds);
        }

        if (result.event === "match_result_updated") {
          toast.success("Match result updated");
        }

        if (result.event === "match_live") {
          toast.message("Demo mode started a live match");
        }

        return result.tournament;
      });
    }, 3200);

    return () => {
      window.clearInterval(interval);
    };
  }, [demoMode, tournament?.id]);

  useEffect(() => {
    if (highlightedMatchIds.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedMatchIds([]);
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [highlightedMatchIds]);

  const captainTeams = useMemo(
    () => myTeams.filter((team) => team.captainId === user?.id),
    [myTeams, user?.id]
  );

  const liveStateLabel = demoMode
    ? "Demo mode is simulating live bracket updates"
    : socketConnected
      ? "Socket live - bracket updates stream in automatically"
      : "Polling fallback active - refreshing every 9 seconds";

  return (
    <PageShell>
      {!tournament ? (
        <Card>
          <p className="text-sm text-slate-400">
            {loading ? "Loading tournament..." : "Tournament could not be loaded."}
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="space-y-6 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="cyan">{tournament.game}</Badge>
                <Badge variant="violet">{tournament.format.replaceAll("_", " ")}</Badge>
                <Badge variant={tournament.status === "LIVE" ? "green" : "amber"}>
                  {tournament.status}
                </Badge>
                {tournament.mvp ? <Badge variant="amber">MVP {tournament.mvp.teamName}</Badge> : null}
              </div>
              <div>
                <h1 className="font-display text-4xl uppercase tracking-[0.12em] text-white">
                  {tournament.name}
                </h1>
                <p className="mt-3 max-w-3xl text-slate-300">
                  Organized by {tournament.organizer.name}. Registration closes on{" "}
                  {new Date(tournament.registrationClosesAt).toLocaleString()}.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Start Date" value={new Date(tournament.startDate).toLocaleString()} />
                <MetricCard
                  label="Approved Teams"
                  value={String(
                    tournament.participants.filter((item) => item.status === "APPROVED").length
                  )}
                />
                <MetricCard label="Completed" value={`${tournament.stats.completedMatches}/${tournament.stats.totalMatches}`} />
                <MetricCard label="Progress" value={`${tournament.stats.completionRate}%`} />
              </div>
            </Card>

            <Card className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Live Controls</CardTitle>
                  <CardDescription className="mt-2">
                    Realtime bracket state stays synced through Socket.IO, with polling as a
                    fallback and a demo mode for live presentations.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-300" />
                  </span>
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-300">
                    {demoMode ? "Demo" : socketConnected ? "Socket" : "Polling"}
                  </span>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-300">{liveStateLabel}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant={demoMode ? "default" : "secondary"}
                  onClick={() => setDemoMode((current) => !current)}
                >
                  <Sparkles className="size-4" />
                  {demoMode ? "Disable Demo Mode" : "Enable Demo Mode"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await loadTournament("manual");
                    toast.success("Tournament refreshed");
                  }}
                >
                  <RefreshCw className="size-4" />
                  Refresh Snapshot
                </Button>
              </div>

              <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Demo Note</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Demo mode animates a local copy of the bracket for presentations. It does
                  not overwrite the real tournament data.
                </p>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.34fr_0.28fr_0.38fr]">
            <Card className="space-y-4">
              <div>
                <CardTitle>Register your team</CardTitle>
                <CardDescription className="mt-2">
                  Only team captains can register. Entries land in the approval queue before seeding.
                </CardDescription>
              </div>
              {user ? (
                captainTeams.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                    No teams yet. Create one in your dashboard, then return here to register.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {captainTeams.map((team) => {
                      const alreadyRegistered = tournament.participants.some(
                        (participant) => participant.team.id === team.id
                      );

                      return (
                        <div
                          key={team.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-slate-950/50 px-4 py-4"
                        >
                          <div>
                            <p className="font-medium text-white">{team.name}</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              Invite {team.inviteCode}
                            </p>
                          </div>
                          <Button
                            variant={alreadyRegistered ? "secondary" : "default"}
                            disabled={
                              alreadyRegistered ||
                              registeringTeamId === team.id ||
                              tournament.status !== "REGISTRATION"
                            }
                            onClick={async () => {
                              try {
                                setRegisteringTeamId(team.id);
                                await apiFetch(`/tournaments/${params.id}/register-team`, {
                                  method: "POST",
                                  body: JSON.stringify({ teamId: team.id })
                                });
                                toast.success("Team submitted for approval");
                                await loadTournament("manual");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to register team"
                                );
                              } finally {
                                setRegisteringTeamId(null);
                              }
                            }}
                          >
                            {alreadyRegistered
                              ? "Registered"
                              : registeringTeamId === team.id
                                ? "Submitting..."
                                : "Register"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                  Sign in as a captain to register a team.
                </div>
              )}
            </Card>

            <div className="space-y-6">
              <Card className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-amber-200">
                    <Crown className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Tournament MVP</CardTitle>
                    <CardDescription className="mt-1">
                      Top team based on wins and match volume.
                    </CardDescription>
                  </div>
                </div>
                {tournament.mvp ? (
                  <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/5 p-4">
                    <p className="font-display text-lg uppercase tracking-[0.14em] text-white">
                      {tournament.mvp.teamName}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {tournament.mvp.wins} wins across {tournament.mvp.matchesPlayed} played matches.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                    MVP will appear after completed matches are recorded.
                  </div>
                )}
              </Card>

              <Card className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                    <Trophy className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Leaderboard</CardTitle>
                    <CardDescription className="mt-1">
                      Wins and matches played inside this tournament.
                    </CardDescription>
                  </div>
                </div>
                {tournament.leaderboard.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                    No matches yet. Once results come in, the leaderboard will populate here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tournament.leaderboard.map((entry, index) => (
                      <div
                        key={entry.teamId}
                        className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-950/50 px-4 py-4"
                      >
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Rank #{index + 1}
                          </p>
                          <p className="font-medium text-white">{entry.teamName}</p>
                        </div>
                        <div className="text-right text-sm text-slate-300">
                          <p>{entry.wins} wins</p>
                          <p className="text-slate-500">{entry.matchesPlayed} played</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                  <Activity className="size-5" />
                </div>
                <div>
                  <CardTitle>Participants</CardTitle>
                  <CardDescription className="mt-1">
                    Approval status and active roster overview.
                  </CardDescription>
                </div>
              </div>
              {tournament.participants.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                  No teams have registered yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {tournament.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{participant.team.name}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Captain {participant.team.captainName}
                          </p>
                        </div>
                        <Badge
                          variant={
                            participant.status === "APPROVED"
                              ? "green"
                              : participant.status === "PENDING"
                                ? "amber"
                                : "rose"
                          }
                        >
                          {participant.status}
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {participant.team.members.map((member) => (
                          <span
                            key={member.id}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
                          >
                            {member.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle>Bracket</CardTitle>
                <CardDescription className="mt-2">
                  Connectors show winner flow in cyan and lower-bracket drops in amber. Score
                  changes animate in real time.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <Radio className="size-4 text-emerald-300" />
                {liveStateLabel}
              </div>
            </div>
            <BracketView
              matches={tournament.matches}
              highlightedMatchIds={highlightedMatchIds}
              liveStateLabel={liveStateLabel}
            />
          </section>
        </div>
      )}
    </PageShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
