"use client";

import { useMemo } from "react";
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
type BracketSection = {
  type: BracketType;
  rounds: Array<{
    round: number;
    matches: TournamentMatch[];
  }>;
};
type PositionedMatch = {
  match: TournamentMatch;
  roundIndex: number;
  matchIndex: number;
  x: number;
  y: number;
};
type SectionLayout = {
  type: BracketType;
  width: number;
  height: number;
  rounds: Array<{
    round: number;
    roundIndex: number;
    x: number;
  }>;
  positionedMatches: PositionedMatch[];
  connections: Connection[];
};

const COLUMN_WIDTH = 320;
const CARD_WIDTH = 280;
const CARD_HEIGHT = 228;
const MATCH_VERTICAL_GAP = 20;
const BRACKET_PADDING = 28;
const ROUND_HEADER_HEIGHT = 58;

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

const buildSections = (matches: TournamentMatch[]): BracketSection[] => {
  const grouped = matches.reduce<Record<BracketType, TournamentMatch[]>>(
    (accumulator, match) => {
      accumulator[match.bracketType] = [...(accumulator[match.bracketType] ?? []), match];
      return accumulator;
    },
    {
      WINNERS: [],
      LOSERS: [],
      GRAND_FINAL: []
    }
  );

  return (Object.keys(grouped) as BracketType[])
    .filter((type) => grouped[type].length > 0)
    .map((type) => {
      const rounds = groupByRounds(grouped[type]);
      return {
        type,
        rounds: Object.keys(rounds)
          .map((round) => Number(round))
          .sort((a, b) => a - b)
          .map((round) => ({
            round,
            matches: rounds[round]
          }))
      };
    });
};

const getSpacingFactor = (type: BracketType, roundIndex: number) => {
  if (type === "GRAND_FINAL") {
    return 1;
  }

  const capped = Math.min(roundIndex, 2);
  return type === "WINNERS" ? 2 ** capped : Math.min(4, 1 + capped);
};

const buildSectionLayout = (section: BracketSection): SectionLayout => {
  const positionedMatches: PositionedMatch[] = [];
  const rounds = section.rounds.map((entry, roundIndex) => ({
    round: entry.round,
    roundIndex,
    x: BRACKET_PADDING + roundIndex * COLUMN_WIDTH
  }));

  section.rounds.forEach((round, roundIndex) => {
    const spacingFactor = getSpacingFactor(section.type, roundIndex);
    const baseStep = CARD_HEIGHT + MATCH_VERTICAL_GAP;
    const verticalStep = baseStep * spacingFactor;
    round.matches.forEach((match, matchIndex) => {
      const x = BRACKET_PADDING + roundIndex * COLUMN_WIDTH;
      const y =
        ROUND_HEADER_HEIGHT +
        BRACKET_PADDING +
        matchIndex * verticalStep +
        ((spacingFactor - 1) * baseStep) / 2;

      positionedMatches.push({
        match,
        roundIndex,
        matchIndex,
        x,
        y
      });
    });
  });

  const byId = new Map(positionedMatches.map((entry) => [entry.match.id, entry]));
  const connections: Connection[] = [];

  positionedMatches.forEach((node) => {
    const source = node.match;
    const sourceX = node.x + CARD_WIDTH;
    const sourceY = node.y + CARD_HEIGHT / 2;

    const append = (targetMatchId: string | null | undefined, kind: "win" | "lose") => {
      if (!targetMatchId) {
        return;
      }
      const target = byId.get(targetMatchId);
      if (!target) {
        return;
      }

      const targetX = target.x;
      const targetY = target.y + CARD_HEIGHT / 2;
      const distance = Math.max(50, targetX - sourceX);
      const curve = Math.max(42, distance * 0.44);

      connections.push({
        id: `${source.id}-${targetMatchId}-${kind}`,
        kind,
        active: source.status === "COMPLETED" || source.status === "LIVE",
        path: `M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}`
      });
    };

    append(source.nextWinMatchId, "win");
    append(source.nextLoseMatchId, "lose");
  });

  const maxBottom =
    positionedMatches.length > 0
      ? Math.max(...positionedMatches.map((entry) => entry.y + CARD_HEIGHT))
      : ROUND_HEADER_HEIGHT + BRACKET_PADDING + CARD_HEIGHT;
  const width =
    rounds.length > 0
      ? BRACKET_PADDING * 2 + (rounds.length - 1) * COLUMN_WIDTH + CARD_WIDTH
      : BRACKET_PADDING * 2 + CARD_WIDTH;
  const height = maxBottom + BRACKET_PADDING;

  return {
    type: section.type,
    width,
    height,
    rounds,
    positionedMatches,
    connections
  };
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
  const sections = useMemo(() => buildSections(matches), [matches]);
  const layouts = useMemo(() => sections.map((section) => buildSectionLayout(section)), [sections]);

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
        <div className="space-y-10 pr-6">
          {layouts.map((layout) => {
            const type = layout.type;
            const Icon = sectionIcon(type);

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

                <div
                  className="relative"
                  style={{
                    width: `${layout.width}px`,
                    height: `${layout.height}px`
                  }}
                >
                  <svg className="pointer-events-none absolute inset-0 h-full w-full">
                    <AnimatePresence>
                      {layout.connections.map((connection) => (
                        <motion.path
                          key={connection.id}
                          d={connection.path}
                          fill="none"
                          stroke={connection.kind === "win" ? "#22d3ee" : "#f59e0b"}
                          strokeDasharray={connection.kind === "lose" ? "6 8" : undefined}
                          strokeLinecap="round"
                          strokeWidth={connection.active ? 2.8 : 2}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{
                            pathLength: 1,
                            opacity: connection.active ? 0.95 : 0.32
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                        />
                      ))}
                    </AnimatePresence>
                  </svg>

                  {layout.rounds.map((roundMeta) => (
                    <div
                      key={`${type}-${roundMeta.round}`}
                      className="absolute rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300"
                      style={{
                        left: `${roundMeta.x}px`,
                        top: `${BRACKET_PADDING / 2}px`
                      }}
                    >
                      Round {roundMeta.round}
                    </div>
                  ))}

                  {layout.positionedMatches.map((node) => {
                    const { match, roundIndex, matchIndex, x, y } = node;
                    const highlighted = highlightedMatchIds.includes(match.id);

                    return (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.3,
                          delay: roundIndex * 0.08 + matchIndex * 0.05
                        }}
                        className="absolute"
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          width: `${CARD_WIDTH}px`,
                          minHeight: `${CARD_HEIGHT}px`
                        }}
                      >
                        <Card
                          className={cn(
                            "h-full space-y-4 border-white/10 bg-slate-950/85 p-5 transition",
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
                              <Badge variant={statusBadge(match.status) as never} className="min-w-20 justify-center">
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
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-white">
                                    {team?.name ?? (isBye ? "BYE / Walkover" : "Waiting for team")}
                                  </p>
                                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                    {index === 0 ? "Team A" : "Team B"}
                                  </p>
                                </div>
                                <div className="min-w-14 text-right">
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
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
