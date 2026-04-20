import bcrypt from "bcryptjs";
import { advanceMatchTree, createBracketInDatabase } from "../src/lib/brackets";
import { prisma } from "../src/lib/prisma";

async function recordMatchResult(matchId: string, scoreA: number, scoreB: number) {
  const match = await prisma.match.findUnique({
    where: { id: matchId }
  });

  if (!match?.teamAId || !match.teamBId) {
    return;
  }

  const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;
  const loserId = scoreA > scoreB ? match.teamBId : match.teamAId;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      scoreA,
      scoreB,
      winnerId,
      status: "COMPLETED"
    }
  });

  await advanceMatchTree(prisma, matchId, winnerId, loserId);
}

async function main() {
  await prisma.match.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("Demo12345", 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin Operator",
        email: "admin@qazaq.gg",
        passwordHash: password,
        role: "ADMIN"
      }
    }),
    prisma.user.create({
      data: {
        name: "Tournament Lead",
        email: "organizer@qazaq.gg",
        passwordHash: password,
        role: "ORGANIZER"
      }
    }),
    prisma.user.create({
      data: {
        name: "Aruzhan Nomad",
        email: "aruzhan@qazaq.gg",
        passwordHash: password,
        role: "PLAYER"
      }
    }),
    prisma.user.create({
      data: {
        name: "Daniyar Barys",
        email: "daniyar@qazaq.gg",
        passwordHash: password,
        role: "PLAYER"
      }
    }),
    prisma.user.create({
      data: {
        name: "Madi Wolves",
        email: "madi@qazaq.gg",
        passwordHash: password,
        role: "PLAYER"
      }
    }),
    prisma.user.create({
      data: {
        name: "Amina Altai",
        email: "amina@qazaq.gg",
        passwordHash: password,
        role: "PLAYER"
      }
    }),
    prisma.user.create({
      data: {
        name: "Nursultan Turan",
        email: "nursultan@qazaq.gg",
        passwordHash: password,
        role: "PLAYER"
      }
    }),
    prisma.user.create({
      data: {
        name: "Aigerim Pulse",
        email: "aigerim@qazaq.gg",
        passwordHash: password,
        role: "PLAYER"
      }
    }),
    prisma.user.create({
      data: {
        name: "Support Scout",
        email: "support@qazaq.gg",
        passwordHash: password,
        role: "PLAYER"
      }
    })
  ]);

  const [, organizer, aruzhan, daniyar, madi, amina, nursultan, aigerim, support] = users;

  const teams = await Promise.all([
    prisma.team.create({
      data: {
        name: "Nomad Five",
        logoUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420",
        inviteCode: "NOMAD5",
        captainId: aruzhan.id,
        members: {
          create: [{ userId: aruzhan.id }, { userId: support.id }]
        }
      }
    }),
    prisma.team.create({
      data: {
        name: "Barys Unit",
        logoUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e",
        inviteCode: "BARYS1",
        captainId: daniyar.id,
        members: {
          create: [{ userId: daniyar.id }]
        }
      }
    }),
    prisma.team.create({
      data: {
        name: "Steppe Wolves",
        logoUrl: "https://images.unsplash.com/photo-1542751110-97427bbecf20",
        inviteCode: "WOLF77",
        captainId: madi.id,
        members: {
          create: [{ userId: madi.id }]
        }
      }
    }),
    prisma.team.create({
      data: {
        name: "Altai Core",
        logoUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6",
        inviteCode: "ALTAI9",
        captainId: amina.id,
        members: {
          create: [{ userId: amina.id }]
        }
      }
    }),
    prisma.team.create({
      data: {
        name: "Turan Rift",
        logoUrl: "https://images.unsplash.com/photo-1511882150382-421056c89033",
        inviteCode: "TURAN8",
        captainId: nursultan.id,
        members: {
          create: [{ userId: nursultan.id }]
        }
      }
    }),
    prisma.team.create({
      data: {
        name: "Aqmola Pulse",
        logoUrl: "https://images.unsplash.com/photo-1542751371-29b1b1d96931",
        inviteCode: "PULSE4",
        captainId: aigerim.id,
        members: {
          create: [{ userId: aigerim.id }]
        }
      }
    })
  ]);

  const [nomadFive, barysUnit, steppeWolves, altaiCore, turanRift, aqmolaPulse] = teams;

  const liveSingle = await prisma.tournament.create({
    data: {
      name: "Qazaq Valorant Masters",
      game: "Valorant",
      format: "SINGLE_ELIMINATION",
      startDate: new Date("2026-05-10T16:00:00.000Z"),
      registrationClosesAt: new Date("2026-05-01T12:00:00.000Z"),
      status: "LIVE",
      organizerId: organizer.id
    }
  });

  const liveDouble = await prisma.tournament.create({
    data: {
      name: "Cyber Arena CS2 Open",
      game: "Counter-Strike 2",
      format: "DOUBLE_ELIMINATION",
      startDate: new Date("2026-05-18T18:00:00.000Z"),
      registrationClosesAt: new Date("2026-05-05T10:00:00.000Z"),
      status: "LIVE",
      organizerId: organizer.id
    }
  });

  const openRegistration = await prisma.tournament.create({
    data: {
      name: "Steppe Clash Mobile Legends",
      game: "Mobile Legends",
      format: "SINGLE_ELIMINATION",
      startDate: new Date("2026-06-01T15:00:00.000Z"),
      registrationClosesAt: new Date("2026-05-26T15:00:00.000Z"),
      status: "REGISTRATION",
      organizerId: organizer.id
    }
  });

  await prisma.participant.createMany({
    data: [
      {
        tournamentId: liveSingle.id,
        teamId: nomadFive.id,
        status: "APPROVED",
        seed: 1,
        approvedAt: new Date()
      },
      {
        tournamentId: liveSingle.id,
        teamId: barysUnit.id,
        status: "APPROVED",
        seed: 2,
        approvedAt: new Date()
      },
      {
        tournamentId: liveSingle.id,
        teamId: steppeWolves.id,
        status: "APPROVED",
        seed: 3,
        approvedAt: new Date()
      },
      {
        tournamentId: liveSingle.id,
        teamId: altaiCore.id,
        status: "APPROVED",
        seed: 4,
        approvedAt: new Date()
      },
      {
        tournamentId: liveDouble.id,
        teamId: steppeWolves.id,
        status: "APPROVED",
        seed: 1,
        approvedAt: new Date()
      },
      {
        tournamentId: liveDouble.id,
        teamId: altaiCore.id,
        status: "APPROVED",
        seed: 2,
        approvedAt: new Date()
      },
      {
        tournamentId: liveDouble.id,
        teamId: turanRift.id,
        status: "APPROVED",
        seed: 3,
        approvedAt: new Date()
      },
      {
        tournamentId: liveDouble.id,
        teamId: aqmolaPulse.id,
        status: "APPROVED",
        seed: 4,
        approvedAt: new Date()
      },
      {
        tournamentId: openRegistration.id,
        teamId: nomadFive.id,
        status: "PENDING"
      },
      {
        tournamentId: openRegistration.id,
        teamId: turanRift.id,
        status: "PENDING"
      }
    ]
  });

  const singleParticipants = await prisma.participant.findMany({
    where: {
      tournamentId: liveSingle.id,
      status: "APPROVED"
    },
    include: {
      team: true
    },
    orderBy: {
      seed: "asc"
    }
  });

  const doubleParticipants = await prisma.participant.findMany({
    where: {
      tournamentId: liveDouble.id,
      status: "APPROVED"
    },
    include: {
      team: true
    },
    orderBy: {
      seed: "asc"
    }
  });

  await createBracketInDatabase(prisma, liveSingle.id, "SINGLE_ELIMINATION", singleParticipants);
  await createBracketInDatabase(prisma, liveDouble.id, "DOUBLE_ELIMINATION", doubleParticipants);

  const singleRoundOne = await prisma.match.findMany({
    where: {
      tournamentId: liveSingle.id,
      round: 1
    },
    orderBy: {
      slot: "asc"
    }
  });

  await recordMatchResult(singleRoundOne[0].id, 2, 1);
  await recordMatchResult(singleRoundOne[1].id, 2, 0);

  const doubleRoundOne = await prisma.match.findMany({
    where: {
      tournamentId: liveDouble.id,
      bracketType: "WINNERS",
      round: 1
    },
    orderBy: {
      slot: "asc"
    }
  });

  await recordMatchResult(doubleRoundOne[0].id, 1, 2);
  await recordMatchResult(doubleRoundOne[1].id, 2, 0);

  console.log("Seed completed.");
  console.log("Admin: admin@qazaq.gg / Demo12345");
  console.log("Organizer: organizer@qazaq.gg / Demo12345");
  console.log("Player: aruzhan@qazaq.gg / Demo12345");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
