"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Radar, Rocket, ShieldCheck, TimerReset, Trophy } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const highlights = [
  {
    icon: Trophy,
    title: "Full Tournament Control",
    text: "Run single elimination and streamlined double elimination brackets from one command center."
  },
  {
    icon: Radar,
    title: "Realtime Match Updates",
    text: "Scores propagate live through Socket.IO so brackets stay fresh without reloads."
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    text: "Admins, organizers, and players each get a clear, secure workflow."
  },
  {
    icon: TimerReset,
    title: "Fast Team Operations",
    text: "Invite codes, approvals, and registration keep roster management lightweight."
  }
];

export default function LandingPage() {
  return (
    <PageShell>
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <Badge variant="cyan">Live Esports Operations</Badge>
          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl uppercase leading-tight tracking-[0.08em] text-white md:text-6xl"
            >
              Run brackets with the clarity of a control room.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-2xl text-lg leading-8 text-slate-300"
            >
              Qazaq Cyber Tournament Platform gives organizers, admins, and players one
              futuristic hub for tournament operations, team coordination, and live
              bracket updates.
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap gap-3"
          >
            <Button asChild size="lg">
              <Link href="/register">
                <Rocket className="size-4" />
                Launch Platform
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/tournaments">Browse Tournaments</Link>
            </Button>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Realtime Brackets", "Socket-driven updates"],
              ["Team Workflow", "Invite and approve"],
              ["Admin Ready", "Live score control"]
            ].map(([title, text]) => (
              <Card key={title} className="p-5">
                <p className="font-display text-sm uppercase tracking-[0.18em] text-cyan-300">
                  {title}
                </p>
                <p className="mt-2 text-sm text-slate-400">{text}</p>
              </Card>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -left-8 top-10 size-24 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -right-4 bottom-12 size-32 rounded-full bg-indigo-500/20 blur-3xl" />
          <Card className="relative overflow-hidden p-7">
            <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-xs uppercase tracking-[0.28em] text-cyan-300">
                    Match Feed
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    Kazakhstan Invitational
                  </p>
                </div>
                <Badge variant="green">Live</Badge>
              </div>
              <div className="space-y-4">
                {[
                  ["Nomad Five", 2, "Barys Unit", 1],
                  ["Steppe Wolves", 1, "Aqmola Pulse", 0],
                  ["Altai Core", 0, "Turan Rift", 2]
                ].map(([a, sa, b, sb]) => (
                  <div
                    key={`${a}-${b}`}
                    className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>{a}</span>
                      <span>{sa as number}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                      <span>{b}</span>
                      <span>{sb as number}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      <section className="mt-20 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
          >
            <Card className="h-full">
              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                <item.icon className="size-5" />
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription className="mt-3 leading-7">{item.text}</CardDescription>
            </Card>
          </motion.div>
        ))}
      </section>
    </PageShell>
  );
}
