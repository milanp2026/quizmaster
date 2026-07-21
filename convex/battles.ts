import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const DEFAULT_VOTING_SECONDS = 10;
const DEFAULT_ANSWER_SECONDS = 15;

function isPlayerActive(player: { active?: boolean }) {
  return player.active !== false;
}

function now() {
  return Date.now();
}

function winsNeeded(totalQuestions: number) {
  return Math.floor(totalQuestions / 2) + 1;
}

function shuffleWithSeed<T>(items: T[], seed: string) {
  return items
    .map((item, index) => {
      let score = 0;
      for (let i = 0; i < seed.length; i += 1) {
        score += seed.charCodeAt(i) * (index + 3) * (i + 1);
      }
      return { item, score: (score * 9301 + 49297) % 233280 };
    })
    .sort((left, right) => left.score - right.score)
    .map(({ item }) => item);
}

async function getActivePlayers(ctx: MutationCtx, gameId: Id<"games">) {
  const players = await ctx.db
    .query("players")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();

  return players.filter(isPlayerActive);
}

async function getOrCreateStats(
  ctx: MutationCtx,
  gameId: Id<"games">,
  playerId: Id<"players">,
) {
  const existing = await ctx.db
    .query("playerBattleStats")
    .withIndex("by_game_player", (q) => q.eq("gameId", gameId).eq("playerId", playerId))
    .first();

  if (existing) {
    return existing;
  }

  const statsId = await ctx.db.insert("playerBattleStats", {
    gameId,
    playerId,
    battlesPlayed: 0,
    battlesWon: 0,
    timesShownInVoting: 0,
  });

  return await ctx.db.get(statsId);
}

async function scoreAutomaticAnswers(ctx: MutationCtx, battle: Doc<"battles">) {
  if (!battle.currentBattleQuestionId || battle.judgingMode !== "automatic") {
    return;
  }

  const currentBattleQuestionId = battle.currentBattleQuestionId;
  const question = await ctx.db.get(currentBattleQuestionId);
  if (!question || question.type !== "multiple_choice" || !question.correctOption) {
    return;
  }

  const answers = await ctx.db
    .query("battleAnswers")
    .withIndex("by_battle_question", (q) =>
      q.eq("battleId", battle._id).eq("battleQuestionId", currentBattleQuestionId),
    )
    .collect();

  for (const answer of answers) {
    const isCorrect = answer.answer === question.correctOption;
    await ctx.db.patch(answer._id, {
      isCorrect,
      awardedPoints: isCorrect ? battle.pointsPerCorrect : 0,
    });
  }
}

export const getActiveBattle = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("battles")
      .withIndex("by_gameId_status", (q) => q.eq("gameId", args.gameId).eq("status", "active"))
      .first();
  },
});

export const getBattlePlayers = query({
  args: {
    battleId: v.optional(v.id("battles")),
  },
  handler: async (ctx, args) => {
    if (!args.battleId) {
      return { playerOne: null, playerTwo: null };
    }

    const battle = await ctx.db.get(args.battleId);
    return {
      playerOne: battle?.playerOneId ? await ctx.db.get(battle.playerOneId) : null,
      playerTwo: battle?.playerTwoId ? await ctx.db.get(battle.playerTwoId) : null,
    };
  },
});

export const getMyVotingOptions = query({
  args: {
    battleId: v.optional(v.id("battles")),
    voterPlayerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    if (!args.battleId || !args.voterPlayerId) {
      return { options: [], vote: null };
    }

    const optionDoc = await ctx.db
      .query("battleVotingOptions")
      .withIndex("by_battle_voter", (q) =>
        q.eq("battleId", args.battleId as Id<"battles">).eq("voterPlayerId", args.voterPlayerId as Id<"players">),
      )
      .first();
    const vote = await ctx.db
      .query("battleVotes")
      .withIndex("by_battle_voter", (q) =>
        q.eq("battleId", args.battleId as Id<"battles">).eq("voterPlayerId", args.voterPlayerId as Id<"players">),
      )
      .first();

    if (!optionDoc) {
      return { options: [], vote };
    }

    const options = await Promise.all(optionDoc.optionPlayerIds.map((playerId) => ctx.db.get(playerId)));
    return { options: options.filter(Boolean), vote };
  },
});

export const getBattleVotes = query({
  args: {
    battleId: v.optional(v.id("battles")),
  },
  handler: async (ctx, args) => {
    if (!args.battleId) {
      return [];
    }

    const votes = await ctx.db
      .query("battleVotes")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId as Id<"battles">))
      .collect();
    const counts = new Map<string, { playerId: Id<"players">; votes: number; player: Doc<"players"> | null }>();

    for (const vote of votes) {
      const key = vote.selectedPlayerId;
      const current = counts.get(key) ?? {
        playerId: vote.selectedPlayerId,
        votes: 0,
        player: await ctx.db.get(vote.selectedPlayerId),
      };
      current.votes += 1;
      counts.set(key, current);
    }

    return Array.from(counts.values()).sort((left, right) => right.votes - left.votes);
  },
});

export const getCurrentBattleQuestion = query({
  args: {
    battleId: v.optional(v.id("battles")),
  },
  handler: async (ctx, args) => {
    if (!args.battleId) {
      return null;
    }
    const battle = await ctx.db.get(args.battleId);
    return battle?.currentBattleQuestionId ? await ctx.db.get(battle.currentBattleQuestionId) : null;
  },
});

export const getBattleAnswers = query({
  args: {
    battleId: v.optional(v.id("battles")),
  },
  handler: async (ctx, args) => {
    if (!args.battleId) {
      return [];
    }

    return await ctx.db
      .query("battleAnswers")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId as Id<"battles">))
      .collect();
  },
});

export const startBattle = mutation({
  args: {
    gameId: v.id("games"),
    totalQuestions: v.number(),
    pointsPerCorrect: v.number(),
    winnerBonus: v.number(),
    loserPoints: v.number(),
    votingDurationSeconds: v.optional(v.number()),
    answerDurationSeconds: v.optional(v.number()),
    questionType: v.union(v.literal("multiple_choice"), v.literal("open"), v.literal("photo")),
    judgingMode: v.union(v.literal("automatic"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    const activeBattle = await ctx.db
      .query("battles")
      .withIndex("by_gameId_status", (q) => q.eq("gameId", args.gameId).eq("status", "active"))
      .first();

    if (activeBattle) {
      throw new Error("Er loopt al een Bonus Battle.");
    }

    const players = await getActivePlayers(ctx, args.gameId);
    if (players.length < 2) {
      throw new Error("Je hebt minimaal 2 actieve spelers nodig.");
    }

    const startedAt = now();
    const battleId = await ctx.db.insert("battles", {
      gameId: args.gameId,
      status: "active",
      phase: "voting",
      votingStartedAt: startedAt,
      votingEndsAt: startedAt + (args.votingDurationSeconds ?? DEFAULT_VOTING_SECONDS) * 1000,
      totalQuestions: args.totalQuestions,
      questionsPlayed: 0,
      playerOneWins: 0,
      playerTwoWins: 0,
      pointsPerCorrect: args.pointsPerCorrect,
      winnerBonus: args.winnerBonus,
      loserPoints: args.loserPoints,
      votingDurationSeconds: args.votingDurationSeconds ?? DEFAULT_VOTING_SECONDS,
      answerDurationSeconds: args.answerDurationSeconds ?? DEFAULT_ANSWER_SECONDS,
      questionType: args.questionType,
      judgingMode: args.judgingMode,
      pointsAwarded: false,
      createdAt: startedAt,
    });

    const stats = await Promise.all(players.map((player) => getOrCreateStats(ctx, args.gameId, player._id)));
    const statByPlayerId = new Map(stats.filter(Boolean).map((stat) => [stat!.playerId, stat!]));

    for (const voter of players) {
      const eligible = players
        .filter((player) => player._id !== voter._id)
        .sort((left, right) => {
          const leftStats = statByPlayerId.get(left._id);
          const rightStats = statByPlayerId.get(right._id);
          const leftWeight = (leftStats?.timesShownInVoting ?? 0) + (leftStats?.battlesPlayed ?? 0) * 3;
          const rightWeight = (rightStats?.timesShownInVoting ?? 0) + (rightStats?.battlesPlayed ?? 0) * 3;
          return leftWeight - rightWeight;
        });
      const options = shuffleWithSeed(eligible.slice(0, Math.min(8, eligible.length)), `${battleId}:${voter._id}`).slice(0, 5);

      await ctx.db.insert("battleVotingOptions", {
        battleId,
        voterPlayerId: voter._id,
        optionPlayerIds: options.map((player) => player._id),
        createdAt: startedAt,
      });

      for (const option of options) {
        const optionStats = statByPlayerId.get(option._id);
        if (optionStats) {
          await ctx.db.patch(optionStats._id, {
            timesShownInVoting: optionStats.timesShownInVoting + 1,
          });
        }
      }
    }

    return battleId;
  },
});

export const submitBattleVote = mutation({
  args: {
    battleId: v.id("battles"),
    voterPlayerId: v.id("players"),
    selectedPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || battle.phase !== "voting" || battle.status !== "active") {
      throw new Error("Stemmen is gesloten.");
    }
    if ((battle.votingEndsAt ?? 0) < now()) {
      throw new Error("De stemtijd is voorbij.");
    }
    if (args.voterPlayerId === args.selectedPlayerId) {
      throw new Error("Je kunt niet op jezelf stemmen.");
    }

    const existing = await ctx.db
      .query("battleVotes")
      .withIndex("by_battle_voter", (q) => q.eq("battleId", args.battleId).eq("voterPlayerId", args.voterPlayerId))
      .first();
    if (existing) {
      throw new Error("Je hebt al gestemd.");
    }

    const options = await ctx.db
      .query("battleVotingOptions")
      .withIndex("by_battle_voter", (q) => q.eq("battleId", args.battleId).eq("voterPlayerId", args.voterPlayerId))
      .first();
    if (!options?.optionPlayerIds.includes(args.selectedPlayerId)) {
      throw new Error("Deze speler staat niet in jouw keuzelijst.");
    }

    await ctx.db.insert("battleVotes", {
      battleId: args.battleId,
      voterPlayerId: args.voterPlayerId,
      selectedPlayerId: args.selectedPlayerId,
      createdAt: now(),
    });
  },
});

export const finishVoting = mutation({
  args: {
    battleId: v.id("battles"),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || battle.phase !== "voting") {
      throw new Error("Deze battle zit niet in de stemfase.");
    }

    const votes = await ctx.db
      .query("battleVotes")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .collect();
    const activePlayers = await getActivePlayers(ctx, battle.gameId);
    const counts = new Map<string, number>();

    for (const vote of votes) {
      counts.set(vote.selectedPlayerId, (counts.get(vote.selectedPlayerId) ?? 0) + 1);
    }

    const ranked = shuffleWithSeed(activePlayers, `${args.battleId}:tie`).sort(
      (left, right) => (counts.get(right._id) ?? 0) - (counts.get(left._id) ?? 0),
    );
    if (ranked.length < 2) {
      throw new Error("Niet genoeg actieve spelers.");
    }

    await ctx.db.patch(args.battleId, {
      phase: "confirming_players",
      playerOneId: ranked[0]._id,
      playerTwoId: ranked[1]._id,
    });
  },
});

export const confirmBattlePlayers = mutation({
  args: {
    battleId: v.id("battles"),
    playerOneId: v.optional(v.id("players")),
    playerTwoId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || !["confirming_players", "countdown"].includes(battle.phase)) {
      throw new Error("Deelnemers kunnen nu niet worden bevestigd.");
    }

    const playerOneId = args.playerOneId ?? battle.playerOneId;
    const playerTwoId = args.playerTwoId ?? battle.playerTwoId;
    if (!playerOneId || !playerTwoId || playerOneId === playerTwoId) {
      throw new Error("Kies twee verschillende spelers.");
    }

    await ctx.db.patch(args.battleId, {
      phase: "countdown",
      playerOneId,
      playerTwoId,
    });
  },
});

export const createBattleQuestion = mutation({
  args: {
    battleId: v.id("battles"),
    prompt: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("open"), v.literal("photo")),
    optionA: v.optional(v.string()),
    optionB: v.optional(v.string()),
    optionC: v.optional(v.string()),
    optionD: v.optional(v.string()),
    correctOption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || battle.status !== "active") {
      throw new Error("Battle niet gevonden.");
    }
    if (!battle.playerOneId || !battle.playerTwoId) {
      throw new Error("Bevestig eerst de deelnemers.");
    }
    if (args.prompt.trim().length < 3) {
      throw new Error("Vul een battlevraag in.");
    }

    const questionId = await ctx.db.insert("battleQuestions", {
      battleId: args.battleId,
      prompt: args.prompt.trim(),
      type: args.type,
      optionA: args.optionA?.trim(),
      optionB: args.optionB?.trim(),
      optionC: args.optionC?.trim(),
      optionD: args.optionD?.trim(),
      correctOption: args.correctOption,
      createdAt: now(),
    });

    const startedAt = now();
    await ctx.db.patch(args.battleId, {
      phase: "question_live",
      currentBattleQuestionId: questionId,
      questionStartedAt: startedAt,
      answerDeadline: startedAt + battle.answerDurationSeconds * 1000,
    });

    await ctx.db.patch(questionId, {
      startedAt,
    });

    return questionId;
  },
});

export const submitBattleAnswer = mutation({
  args: {
    battleId: v.id("battles"),
    battleQuestionId: v.id("battleQuestions"),
    playerId: v.id("players"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    const question = await ctx.db.get(args.battleQuestionId);
    if (!battle || !question || battle.phase !== "question_live") {
      throw new Error("Deze battlevraag is niet live.");
    }
    if (battle.currentBattleQuestionId !== args.battleQuestionId) {
      throw new Error("Dit is niet de actieve battlevraag.");
    }
    if (args.playerId !== battle.playerOneId && args.playerId !== battle.playerTwoId) {
      throw new Error("Alleen de gekozen deelnemers mogen antwoorden.");
    }
    const submittedAt = now();
    if ((battle.answerDeadline ?? 0) < submittedAt) {
      throw new Error("Je bent te laat.");
    }
    const existing = await ctx.db
      .query("battleAnswers")
      .withIndex("by_question_player", (q) => q.eq("battleQuestionId", args.battleQuestionId).eq("playerId", args.playerId))
      .first();
    if (existing) {
      throw new Error("Je hebt al geantwoord.");
    }

    await ctx.db.insert("battleAnswers", {
      battleId: args.battleId,
      battleQuestionId: args.battleQuestionId,
      playerId: args.playerId,
      answer: args.answer.trim(),
      submittedAt,
      responseTimeMs: Math.max(0, submittedAt - (battle.questionStartedAt ?? submittedAt)),
    });

    const answers = await ctx.db
      .query("battleAnswers")
      .withIndex("by_battle_question", (q) => q.eq("battleId", args.battleId).eq("battleQuestionId", args.battleQuestionId))
      .collect();
    const answeredPlayerIds = new Set(answers.map((answer) => answer.playerId));
    answeredPlayerIds.add(args.playerId);

    if (battle.playerOneId && battle.playerTwoId && answeredPlayerIds.has(battle.playerOneId) && answeredPlayerIds.has(battle.playerTwoId)) {
      await ctx.db.patch(args.battleId, { phase: "judging" });
      await ctx.db.patch(args.battleQuestionId, { closedAt: submittedAt });
    }
  },
});

export const closeBattleQuestion = mutation({
  args: {
    battleId: v.id("battles"),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle?.currentBattleQuestionId) {
      throw new Error("Geen actieve battlevraag.");
    }

    await scoreAutomaticAnswers(ctx, battle);
    await ctx.db.patch(args.battleId, { phase: "judging" });
    await ctx.db.patch(battle.currentBattleQuestionId, { closedAt: now() });
  },
});

export const judgeBattleAnswer = mutation({
  args: {
    answerId: v.id("battleAnswers"),
    isCorrect: v.boolean(),
    awardedPoints: v.number(),
  },
  handler: async (ctx, args) => {
    const answer = await ctx.db.get(args.answerId);
    if (!answer) {
      throw new Error("Antwoord niet gevonden.");
    }
    await ctx.db.patch(args.answerId, {
      isCorrect: args.isCorrect,
      awardedPoints: args.isCorrect ? args.awardedPoints : 0,
    });
  },
});

export const completeBattleQuestion = mutation({
  args: {
    battleId: v.id("battles"),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle?.currentBattleQuestionId || !battle.playerOneId || !battle.playerTwoId) {
      throw new Error("Battle is niet klaar voor beoordeling.");
    }

    await scoreAutomaticAnswers(ctx, battle);

    const answers = await ctx.db
      .query("battleAnswers")
      .withIndex("by_battle_question", (q) => q.eq("battleId", args.battleId).eq("battleQuestionId", battle.currentBattleQuestionId!))
      .collect();
    const playerOneAnswer = answers.find((answer) => answer.playerId === battle.playerOneId);
    const playerTwoAnswer = answers.find((answer) => answer.playerId === battle.playerTwoId);
    const playerOneCorrect = playerOneAnswer?.isCorrect === true;
    const playerTwoCorrect = playerTwoAnswer?.isCorrect === true;
    let playerOneWins = battle.playerOneWins;
    let playerTwoWins = battle.playerTwoWins;

    if (playerOneCorrect && !playerTwoCorrect) {
      playerOneWins += 1;
    } else if (playerTwoCorrect && !playerOneCorrect) {
      playerTwoWins += 1;
    } else if (playerOneCorrect && playerTwoCorrect && playerOneAnswer && playerTwoAnswer) {
      if (playerOneAnswer.responseTimeMs < playerTwoAnswer.responseTimeMs) {
        playerOneWins += 1;
      } else if (playerTwoAnswer.responseTimeMs < playerOneAnswer.responseTimeMs) {
        playerTwoWins += 1;
      }
    }

    const questionsPlayed = battle.questionsPlayed + 1;
    const needed = winsNeeded(battle.totalQuestions);
    const finished =
      playerOneWins >= needed ||
      playerTwoWins >= needed ||
      questionsPlayed >= battle.totalQuestions ||
      playerOneWins + (battle.totalQuestions - questionsPlayed) < playerTwoWins ||
      playerTwoWins + (battle.totalQuestions - questionsPlayed) < playerOneWins;

    const patch: Partial<Doc<"battles">> = {
      phase: finished ? "finished" : "question_result",
      questionsPlayed,
      playerOneWins,
      playerTwoWins,
    };

    if (finished) {
      patch.completedAt = now();
      if (playerOneWins > playerTwoWins) {
        patch.winnerId = battle.playerOneId;
      } else if (playerTwoWins > playerOneWins) {
        patch.winnerId = battle.playerTwoId;
      }
    }

    await ctx.db.patch(args.battleId, patch);
  },
});

export const awardBattlePoints = mutation({
  args: {
    battleId: v.id("battles"),
    winnerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const battle = await ctx.db.get(args.battleId);
    if (!battle || battle.pointsAwarded) {
      throw new Error("Punten zijn al toegekend of battle bestaat niet.");
    }
    if (!battle.playerOneId || !battle.playerTwoId) {
      throw new Error("Geen deelnemers gevonden.");
    }

    const winnerId = args.winnerId ?? battle.winnerId;
    const playerOne = await ctx.db.get(battle.playerOneId);
    const playerTwo = await ctx.db.get(battle.playerTwoId);
    if (!playerOne || !playerTwo) {
      throw new Error("Spelers niet gevonden.");
    }

    const answers = await ctx.db
      .query("battleAnswers")
      .withIndex("by_battleId", (q) => q.eq("battleId", args.battleId))
      .collect();
    const playerOneAnswerPoints = answers
      .filter((answer) => answer.playerId === battle.playerOneId)
      .reduce((total, answer) => total + (answer.awardedPoints ?? 0), 0);
    const playerTwoAnswerPoints = answers
      .filter((answer) => answer.playerId === battle.playerTwoId)
      .reduce((total, answer) => total + (answer.awardedPoints ?? 0), 0);
    const playerOneIsWinner = winnerId === battle.playerOneId;
    const playerTwoIsWinner = winnerId === battle.playerTwoId;
    const playerOnePoints = playerOneAnswerPoints + (playerOneIsWinner ? battle.winnerBonus : battle.loserPoints);
    const playerTwoPoints = playerTwoAnswerPoints + (playerTwoIsWinner ? battle.winnerBonus : battle.loserPoints);

    await ctx.db.patch(playerOne._id, { score: playerOne.score + playerOnePoints });
    await ctx.db.patch(playerTwo._id, { score: playerTwo.score + playerTwoPoints });

    for (const playerId of [playerOne._id, playerTwo._id]) {
      const stats = await getOrCreateStats(ctx, battle.gameId, playerId);
      if (stats) {
        await ctx.db.patch(stats._id, {
          battlesPlayed: stats.battlesPlayed + 1,
          battlesWon: stats.battlesWon + (winnerId === playerId ? 1 : 0),
          lastBattleAt: now(),
        });
      }
    }

    await ctx.db.patch(args.battleId, {
      phase: "finished",
      status: "completed",
      winnerId,
      pointsAwarded: true,
      completedAt: now(),
    });
  },
});

export const cancelBattle = mutation({
  args: {
    battleId: v.id("battles"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.battleId, {
      phase: "cancelled",
      status: "cancelled",
      completedAt: now(),
    });
  },
});
