"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, GitBranch, Radio, Swords, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BracketType, TournamentMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

type GroupedRounds = Record<number, TournamentMatch[]>;
type Connection = {
  id: string;
  path: string;
  kind: "win" | "lose";
  active: boolean;
};

const groupByRounds = (matches: TournamentMatch[]) =>
  matches.reduce<GroupedRounds>((accumulator, match) => {
    accumulator[match.round] = [...(accumulator[match.round] ?? []), match];
    return accumulator;
  }, {});

const bracketTitles: Record<BracketType, string> = {
  WINNERS: "Winners Bracket",
  LOSERS: "Losers Bracket",
  GRAND_FINAL: "Grand Final"
};

const sectionIcon = (type: BracketType) => {
  switch (type) {
    case "LOSERS":
      return GitBranch;
    case "GRAND_FINAL":
      return Crown;
    default:
      return Swords;
  }
};

const statusBadge = (status: TournamentMatch["status"]) => {
  switch (status) {
    case "COMPLETED":
      return "green";
    case "READY":
      return "cyan";
    case "LIVE":
      return "amber";
    default:
      return "violet";
  }
};

const measureConnections = (
  boardRef: MutableRefObject<HTMLDivElement | null>,
  cardRefs: MutableRefObject<Record<string, HTMLDivElement | null>>,
  matches: TournamentMatch[]
) => {
  const boardRect = boardRef.current?.getBoundingClientRect();

  if (!boardRect) {
    return [];
  }

  const connections: Connection[] = [];

  matches.forEach((match) => {
    const sourceRect = cardRefs.current[match.id]?.getBoundingClientRect();

    if (!sourceRect) {
      return;
    }

    const appendConnection = (
      targetMatchId: string | null | undefined,
      kind: "win" | "lose"
    ) => {
      if (!targetMatchId) {
        return;
      }

      const targetRect = cardRefs.current[targetMatchId]?.getBoundingClientRect();

      if (!targetRect) {
        return;
      }

      const startX = sourceRect.right - boardRect.left;
      const startY = sourceRect.top - boardRect.top + sourceRect.height / 2;
      const endX = targetRect.left - boardRect.left;
      const endY = targetRect.top - boardRect.top + targetRect.height / 2;
      const controlOffset = Math.max(30, (endX - startX) * 0.45);

      connections.push({
        id: `${match.id}-${targetMatchId}-${kind}`,
        kind,
        active: match.status === "COMPLETED" || match.status === "LIVE",
        path: `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
      });
    };

    appendConnection(match.nextWinMatchId, "win");
    appendConnection(match.nextLoseMatchId, "lose");
  });

  return connections;
};

export function BracketView({
  matches,
  highlightedMatchIds = [],
  liveStateLabel = "Realtime ready"
}: {
  matches: TournamentMatch[];
  highlightedMatchIds?: string[];
  liveStateLabel?: string;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [connections, setConnections] = useState<Connection[]>([]);

  const grouped = useMemo(
    () =>
      matches.reduce<Record<BracketType, TournamentMatch[]>>(
        (accumulator, match) => {
          accumulator[match.bracketType] = [...(accumulator[match.bracketType] ?? []), match];
          return accumulator;
        },
        {
          WINNERS: [],
          LOSERS: [],
          GRAND_FINAL: []
        }
      ),
    [matches]
  );

  useEffect(() => {
    if (!boardRef.current) {
      return;
    }

    const update = () => {
      setConnections(measureConnections(boardRef, cardRefs, matches));
    };

    const observer = new ResizeObserver(() => {
      update();
    });

    observer.observe(boardRef.current);
    Object.values(cardRefs.current).forEach((node) => {
      if (node) {
        observer.observe(node);
      }
    });

    const rafId = requestAnimationFrame(update);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [matches]);

  if (matches.length === 0) {
    return (
      <Card className="border-dashed border-cyan-400/20 bg-cyan-400/5">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <Zap className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="font-display text-sm uppercase tracking-[0.22em] text-cyan-300">
              Bracket Standby
            </p>
            <p className="text-sm leading-7 text-slate-400">
              No matches yet. Once registration closes and approved teams are seeded, the
              full tournament tree will appear here.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-300" />
          </span>
          <p className="text-sm font-medium text-cyan-50">{liveStateLabel}</p>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
          <Radio className="size-4 text-emerald-300" />
          Live bracket topology
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div ref={boardRef} className="relative min-w-[980px] space-y-10 pr-10">
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            <AnimatePresence>
              {connections.map((connection) => (
                <motion.path
                  key={connection.id}
                  d={connection.path}
                  fill="none"
                  stroke={connection.kind === "win" ? "#22d3ee" : "#f59e0b"}
                  strokeDasharray={connection.kind === "lose" ? "6 7" : undefined}
                  strokeLinecap="round"
                  strokeWidth={connection.active ? 2.8 : 1.5}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: 1,
                    opacity: connection.active ? 0.95 : 0.3
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>
          </svg>

          {(Object.keys(grouped) as BracketType[]).map((type) => {
            const bucket = grouped[type];

            if (bucket.length === 0) {
              return null;
            }

            const Icon = sectionIcon(type);
            const rounds = groupByRounds(bucket);

            return (
              <section key={type} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg uppercase tracking-[0.2em] text-white">
                      {bracketTitles[type]}
                    </h3>
                    <p className="text-sm text-slate-400">
                      Winners advance on cyan rails, lower-bracket drops trace the amber path.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  {Object.entries(rounds).map(([round, roundMatches], columnIndex) => (
                    <div key={round} className="flex w-[300px] flex-col gap-4">
                      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
                        Round {round}
                      </div>
                      {roundMatches.map((match, matchIndex) => {
                        const highlighted = highlightedMatchIds.includes(match.id);

                        return (
                          <motion.div
                            key={match.id}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{
                              duration: 0.3,
                              delay: columnIndex * 0.08 + matchIndex * 0.05
                            }}
                            ref={(node) => {
                              cardRefs.current[match.id] = node;
                            }}
                            className="relative"
                          >
                            <Card
                              className={cn(
                                "space-y-4 border-white/10 bg-slate-950/85 p-5",
                                highlighted &&
                                  "border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_0_36px_rgba(34,211,238,0.18)]"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                                    {match.label ?? `Match ${match.slot}`}
                                  </p>
                                  <p className="text-xs text-slate-500">Slot #{match.slot}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {match.status === "LIVE" ? (
                                    <span className="relative flex size-2.5">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
                                      <span className="relative inline-flex size-2.5 rounded-full bg-amber-300" />
                                    </span>
                                  ) : null}
                                  <Badge variant={statusBadge(match.status) as never}>
                                    {match.status}
                                  </Badge>
                                </div>
                              </div>

                              {[match.teamA, match.teamB].map((team, index) => {
                                const isWinner = team?.id && team.id === match.winnerId;
                                const score = index === 0 ? match.scoreA : match.scoreB;
                                const isBye =
                                  match.isAutoAdvanced &&
                                  !team &&
                                  ((index === 0 && match.teamB) || (index === 1 && match.teamA));

                                return (
                                  <motion.div
                                    key={`${match.id}-${index}-${score}`}
                                    initial={highlighted ? { scale: 0.98, opacity: 0.7 } : false}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.25 }}
                                    className={cn(
                                      "flex items-center justify-between rounded-2xl border px-4 py-3 transition",
                                      isWinner
                                        ? "border-emerald-400/30 bg-emerald-400/10"
                                        : "border-white/10 bg-slate-900/80"
                                    )}
                                  >
                                    <div>
                                      <p className="font-medium text-white">
                                        {team?.name ?? (isBye ? "BYE / Walkover" : "Waiting for team")}
                                      </p>
                                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                        {index === 0 ? "Team A" : "Team B"}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      {team ? (
                                        <motion.span
                                          key={`${match.id}-${index}-${score}-${match.updatedAt}`}
                                          initial={highlighted ? { y: -6, opacity: 0.45 } : false}
                                          animate={{ y: 0, opacity: 1 }}
                                          transition={{ duration: 0.2 }}
                                          className="block text-xl font-semibold text-slate-100"
                                        >
                                          {score}
                                        </motion.span>
                                      ) : (
                                        <span className="block text-sm uppercase tracking-[0.2em] text-slate-500">
                                          {isBye ? "Auto" : "--"}
                                        </span>
                                      )}
                                      {isWinner ? (
                                        <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-200">
                                          Advanced
                                        </span>
                                      ) : null}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
