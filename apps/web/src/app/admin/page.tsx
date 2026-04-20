"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { AdminTournament } from "@/lib/types";

type TournamentFormState = {
  name: string;
  game: string;
  format: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
  startDate: string;
  registrationClosesAt: string;
};

type ConfirmState =
  | {
      open: false;
    }
  | {
      open: true;
      title: string;
      description: string;
      confirmLabel: string;
      variant: "default" | "destructive" | "secondary";
      loading: boolean;
      onConfirm: () => Promise<void>;
    };

export default function AdminPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });
  const [form, setForm] = useState<TournamentFormState>({
    name: "",
    game: "",
    format: "SINGLE_ELIMINATION",
    startDate: "",
    registrationClosesAt: ""
  });

  const load = async () => {
    try {
      const payload = await apiFetch<{ tournaments: AdminTournament[] }>("/admin/overview");
      setTournaments(payload.tournaments);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admin panel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "ORGANIZER") {
      void load();
    }
  }, [user?.role]);

  if (user && !["ADMIN", "ORGANIZER"].includes(user.role)) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm text-slate-400">
            This area is reserved for organizers and administrators.
          </p>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-8">
        <div className="space-y-3">
          <Badge variant="rose">Admin Control Center</Badge>
          <h1 className="font-display text-4xl uppercase tracking-[0.12em] text-white">
            Tournament command surface
          </h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Launch tournaments, approve teams, generate brackets, reset a live demo safely,
            and manage locked match results with confirmation.
          </p>
        </div>

        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Create Tournament</CardTitle>
              <CardDescription className="mt-2">
                Organizers can launch events directly from the control center.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-sm text-emerald-100">
              <ShieldCheck className="size-4" />
              Safe admin actions enabled
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Input
              placeholder="Tournament name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <Input
              placeholder="Game title"
              value={form.game}
              onChange={(event) =>
                setForm((current) => ({ ...current, game: event.target.value }))
              }
            />
            <select
              className="h-11 rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-slate-100"
              value={form.format}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  format: event.target.value as TournamentFormState["format"]
                }))
              }
            >
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
            </select>
            <Input
              type="datetime-local"
              value={form.registrationClosesAt}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  registrationClosesAt: event.target.value
                }))
              }
            />
            <Input
              type="datetime-local"
              value={form.startDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, startDate: event.target.value }))
              }
            />
          </div>
          <Button
            disabled={creating}
            onClick={async () => {
              try {
                setCreating(true);
                await apiFetch("/tournaments", {
                  method: "POST",
                  body: JSON.stringify({
                    ...form,
                    startDate: new Date(form.startDate).toISOString(),
                    registrationClosesAt: new Date(form.registrationClosesAt).toISOString()
                  })
                });
                toast.success("Tournament created");
                setForm({
                  name: "",
                  game: "",
                  format: "SINGLE_ELIMINATION",
                  startDate: "",
                  registrationClosesAt: ""
                });
                await load();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to create tournament");
              } finally {
                setCreating(false);
              }
            }}
          >
            {creating ? "Creating..." : "Create Tournament"}
          </Button>
        </Card>

        {loading ? (
          <Card>
            <p className="text-sm text-slate-400">Loading tournaments...</p>
          </Card>
        ) : tournaments.length === 0 ? (
          <Card className="border-dashed">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <CardTitle>No tournaments yet</CardTitle>
                <CardDescription className="mt-2">
                  Create your first tournament above to unlock approvals, bracket generation,
                  and score control.
                </CardDescription>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {tournaments.map((tournament) => {
              const isBusy = (suffix: string) => busyKey === `${tournament.id}:${suffix}`;

              return (
                <Card key={tournament.id} className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                        {tournament.game}
                      </p>
                      <CardTitle className="mt-2">{tournament.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {tournament.approvedParticipants} approved teams - registration closes{" "}
                        {new Date(tournament.registrationClosesAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="violet">{tournament.format.replaceAll("_", " ")}</Badge>
                      <Badge variant={tournament.status === "LIVE" ? "green" : "amber"}>
                        {tournament.status}
                      </Badge>
                      <Button
                        variant="secondary"
                        disabled={isBusy("generate") || isBusy("reset")}
                        onClick={() =>
                          setConfirmState({
                            open: true,
                            title: "Generate bracket",
                            description:
                              "This will lock the current approval state and create the live tournament bracket.",
                            confirmLabel: "Generate Bracket",
                            variant: "default",
                            loading: isBusy("generate"),
                            onConfirm: async () => {
                              try {
                                setBusyKey(`${tournament.id}:generate`);
                                await apiFetch(`/admin/tournaments/${tournament.id}/generate-bracket`, {
                                  method: "POST"
                                });
                                toast.success("Bracket generated");
                                setConfirmState({ open: false });
                                await load();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to generate bracket"
                                );
                              } finally {
                                setBusyKey(null);
                              }
                            }
                          })
                        }
                      >
                        {isBusy("generate") ? "Generating..." : "Generate Bracket"}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={isBusy("generate") || isBusy("reset")}
                        onClick={() =>
                          setConfirmState({
                            open: true,
                            title: "Reset tournament",
                            description:
                              "This removes all generated matches and returns the tournament to a pre-live state. Approved teams remain available for a fresh bracket.",
                            confirmLabel: "Reset Tournament",
                            variant: "destructive",
                            loading: isBusy("reset"),
                            onConfirm: async () => {
                              try {
                                setBusyKey(`${tournament.id}:reset`);
                                await apiFetch(`/admin/tournaments/${tournament.id}/reset`, {
                                  method: "POST"
                                });
                                toast.success("Tournament reset");
                                setConfirmState({ open: false });
                                await load();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to reset tournament"
                                );
                              } finally {
                                setBusyKey(null);
                              }
                            }
                          })
                        }
                      >
                        <RotateCcw className="size-4" />
                        Reset
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                      <div>
                        <p className="font-display text-sm uppercase tracking-[0.2em] text-white">
                          Participants
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Review and approve submitted teams before seeding the bracket.
                        </p>
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
                                    Seed {participant.seed ?? "Pending"}
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
                              {participant.status === "PENDING" ? (
                                <div className="mt-4 flex gap-3">
                                  <Button
                                    size="sm"
                                    disabled={busyKey === `${participant.id}:approve`}
                                    onClick={async () => {
                                      try {
                                        setBusyKey(`${participant.id}:approve`);
                                        await apiFetch(`/admin/participants/${participant.id}/approve`, {
                                          method: "PATCH"
                                        });
                                        toast.success("Team approved");
                                        await load();
                                      } catch (error) {
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to approve team"
                                        );
                                      } finally {
                                        setBusyKey(null);
                                      }
                                    }}
                                  >
                                    {busyKey === `${participant.id}:approve`
                                      ? "Approving..."
                                      : "Approve"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={busyKey === `${participant.id}:reject`}
                                    onClick={async () => {
                                      try {
                                        setBusyKey(`${participant.id}:reject`);
                                        await apiFetch(`/admin/participants/${participant.id}/reject`, {
                                          method: "PATCH"
                                        });
                                        toast.success("Team rejected");
                                        await load();
                                      } catch (error) {
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Unable to reject team"
                                        );
                                      } finally {
                                        setBusyKey(null);
                                      }
                                    }}
                                  >
                                    {busyKey === `${participant.id}:reject`
                                      ? "Rejecting..."
                                      : "Reject"}
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="font-display text-sm uppercase tracking-[0.2em] text-white">
                          Match Control
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Finalize ready matches, or reopen locked results with a replay confirmation.
                        </p>
                      </div>
                      {tournament.matches.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
                          No matches yet. Generate the bracket after approvals to begin match control.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {tournament.matches.map((match) => (
                            <div
                              key={match.id}
                              className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-white">
                                    {match.teamA?.name ?? "TBD"} vs {match.teamB?.name ?? "TBD"}
                                  </p>
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    {match.bracketType} - Round {match.round} - {match.label ?? `Match ${match.slot}`}
                                  </p>
                                </div>
                                <Badge variant={match.status === "COMPLETED" ? "green" : "cyan"}>
                                  {match.status}
                                </Badge>
                              </div>
                              <AdminScoreForm
                                tournamentId={tournament.id}
                                match={match}
                                onSaved={load}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmState({ open: false });
          }
        }}
        title={confirmState.open ? confirmState.title : ""}
        description={confirmState.open ? confirmState.description : ""}
        confirmLabel={confirmState.open ? confirmState.confirmLabel : "Confirm"}
        variant={confirmState.open ? confirmState.variant : "default"}
        loading={confirmState.open ? confirmState.loading : false}
        onConfirm={confirmState.open ? confirmState.onConfirm : async () => undefined}
      />
    </PageShell>
  );
}

function AdminScoreForm({
  tournamentId,
  match,
  onSaved
}: {
  tournamentId: string;
  match: AdminTournament["matches"][number];
  onSaved: () => Promise<void>;
}) {
  const [scoreA, setScoreA] = useState(String(match.scoreA));
  const [scoreB, setScoreB] = useState(String(match.scoreB));
  const [saving, setSaving] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);

  useEffect(() => {
    setScoreA(String(match.scoreA));
    setScoreB(String(match.scoreB));
  }, [match.id, match.scoreA, match.scoreB, tournamentId]);

  const canSubmit = Boolean(match.teamA && match.teamB);

  const saveResult = async (forceEdit = false) => {
    try {
      setSaving(true);
      await apiFetch(`/admin/matches/${match.id}/result`, {
        method: "PATCH",
        body: JSON.stringify({
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
          forceEdit
        })
      });
      toast.success("Match result updated");
      setConfirmEditOpen(false);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save result");
    } finally {
      setSaving(false);
    }
  };

  if (!canSubmit) {
    return (
      <p className="mt-4 text-sm text-slate-400">
        Waiting for both teams before this match can be scored.
      </p>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          className="w-24"
          type="number"
          min={0}
          value={scoreA}
          onChange={(event) => setScoreA(event.target.value)}
        />
        <Input
          className="w-24"
          type="number"
          min={0}
          value={scoreB}
          onChange={(event) => setScoreB(event.target.value)}
        />
        {match.status === "COMPLETED" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={saving}
            onClick={() => setConfirmEditOpen(true)}
          >
            {saving ? "Saving..." : "Edit Locked Result"}
          </Button>
        ) : (
          <Button size="sm" disabled={saving} onClick={() => void saveResult(false)}>
            {saving ? "Saving..." : "Save Result"}
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmEditOpen}
        onOpenChange={setConfirmEditOpen}
        title="Replay downstream matches?"
        description="Editing a completed match will lock in the new result and replay the bracket path that depends on it. Completed downstream matches on that path will be reset."
        confirmLabel="Edit Result"
        variant="destructive"
        loading={saving}
        onConfirm={() => saveResult(true)}
      />
    </>
  );
}
