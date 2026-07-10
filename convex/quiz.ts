import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function createGameCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export const createGame = mutation({
  args: {
    masterPin: v.string(),
  },
  handler: async (ctx, args) => {
    if (!/^\d{4}$/.test(args.masterPin)) {
      throw new Error("Gebruik een pincode van precies 4 cijfers.");
    }

    let code = createGameCode();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const existingGame = await ctx.db
        .query("games")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (!existingGame) {
        break;
      }

      code = createGameCode();
    }

    const gameId = await ctx.db.insert("games", {
      code,
      masterPin: args.masterPin,
      status: "lobby",
      createdAt: Date.now(),
    });

    await ctx.db.insert("gameState", {
      gameId,
      phase: "lobby",
      scoreboardVisible: false,
      answersOpen: false,
    });

    return { gameId, code };
  },
});

export const joinGame = mutation({
  args: {
    code: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const code = args.code.trim();
    const baseName = normalizePlayerName(args.name);

    if (!/^\d{6}$/.test(code)) {
      throw new Error("Voer een gamecode van 6 cijfers in.");
    }

    if (baseName.length < 2) {
      throw new Error("Voer een naam van minimaal 2 tekens in.");
    }

    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!game) {
      throw new Error("Geen game gevonden met deze code.");
    }

    if (game.status !== "lobby") {
      throw new Error("Deze game staat niet meer open voor nieuwe spelers.");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .collect();

    const usedNames = new Set(players.map((player) => player.name.toLowerCase()));
    let playerName = baseName;
    let number = 2;

    while (usedNames.has(playerName.toLowerCase())) {
      playerName = `${baseName} ${number}`;
      number += 1;
    }

    const playerId = await ctx.db.insert("players", {
      gameId: game._id,
      name: playerName,
      score: 0,
      joinedAt: Date.now(),
    });

    return {
      gameId: game._id,
      playerId,
      name: playerName,
    };
  },
});

export const getGame = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const getPlayer = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playerId);
  },
});

export const getGameState = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .first();
  },
});

export const listPlayers = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

export const createQuestion = mutation({
  args: {
    gameId: v.id("games"),
    prompt: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("open")),
    optionA: v.optional(v.string()),
    optionB: v.optional(v.string()),
    optionC: v.optional(v.string()),
    optionD: v.optional(v.string()),
    correctOption: v.optional(v.string()),
    points: v.number(),
    speedBonus: v.boolean(),
  },
  handler: async (ctx, args) => {
    const prompt = args.prompt.trim();

    if (prompt.length < 3) {
      throw new Error("Vul een vraag in.");
    }

    if (args.points < 0 || args.points > 999) {
      throw new Error("Kies punten tussen 0 en 999.");
    }

    if (args.type === "multiple_choice") {
      const options = [args.optionA, args.optionB, args.optionC, args.optionD].map((option) =>
        option?.trim(),
      );

      if (options.some((option) => !option)) {
        throw new Error("Vul alle vier antwoorden in.");
      }

      if (args.correctOption && !["A", "B", "C", "D"].includes(args.correctOption)) {
        throw new Error("Kies A, B, C of D als goed antwoord.");
      }
    }

    return await ctx.db.insert("questions", {
      gameId: args.gameId,
      prompt,
      type: args.type,
      optionA: args.optionA?.trim(),
      optionB: args.optionB?.trim(),
      optionC: args.optionC?.trim(),
      optionD: args.optionD?.trim(),
      correctOption: args.correctOption,
      points: args.points,
      speedBonus: args.speedBonus,
      status: "draft",
      createdAt: Date.now(),
    });
  },
});

export const listQuestions = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("questions")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .collect();
  },
});

export const publishQuestion = mutation({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);

    if (!question) {
      throw new Error("Vraag niet gevonden.");
    }

    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", question.gameId))
      .first();

    if (!gameState) {
      throw new Error("Game-status niet gevonden.");
    }

    const liveQuestions = await ctx.db
      .query("questions")
      .withIndex("by_gameId_status", (q) => q.eq("gameId", question.gameId).eq("status", "live"))
      .collect();

    await Promise.all(
      liveQuestions.map((liveQuestion) =>
        ctx.db.patch(liveQuestion._id, {
          status: "closed",
          closedAt: Date.now(),
        }),
      ),
    );

    await ctx.db.patch(args.questionId, {
      status: "live",
      liveAt: Date.now(),
    });

    await ctx.db.patch(gameState._id, {
      currentQuestionId: args.questionId,
      phase: "question_live",
      scoreboardVisible: false,
      answersOpen: true,
    });
  },
});

export const closeAnswers = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState) {
      throw new Error("Game-status niet gevonden.");
    }

    if (gameState.currentQuestionId) {
      await ctx.db.patch(gameState.currentQuestionId, {
        status: "closed",
        closedAt: Date.now(),
      });
    }

    await ctx.db.patch(gameState._id, {
      phase: "answering_closed",
      answersOpen: false,
    });
  },
});

export const setScoreboardVisible = mutation({
  args: {
    gameId: v.id("games"),
    visible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState) {
      throw new Error("Game-status niet gevonden.");
    }

    await ctx.db.patch(gameState._id, {
      phase: args.visible ? "scoreboard" : "lobby",
      scoreboardVisible: args.visible,
      answersOpen: false,
    });
  },
});

export const getCurrentQuestion = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState?.currentQuestionId) {
      return null;
    }

    return await ctx.db.get(gameState.currentQuestionId);
  },
});

export const submitAnswer = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    questionId: v.id("questions"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .first();
    const question = await ctx.db.get(args.questionId);
    const player = await ctx.db.get(args.playerId);

    if (!gameState?.answersOpen || gameState.currentQuestionId !== args.questionId) {
      throw new Error("Antwoorden zijn gesloten.");
    }

    if (!question || question.status !== "live") {
      throw new Error("Deze vraag is niet live.");
    }

    if (!player || player.gameId !== args.gameId) {
      throw new Error("Speler niet gevonden.");
    }

    const value = args.value.trim();

    if (value.length < 1) {
      throw new Error("Vul een antwoord in.");
    }

    const existingAnswer = await ctx.db
      .query("answers")
      .withIndex("by_player_question", (q) =>
        q.eq("playerId", args.playerId).eq("questionId", args.questionId),
      )
      .first();

    if (existingAnswer) {
      throw new Error("Je hebt deze vraag al beantwoord.");
    }

    return await ctx.db.insert("answers", {
      gameId: args.gameId,
      questionId: args.questionId,
      playerId: args.playerId,
      playerName: player.name,
      value,
      submittedAt: Date.now(),
    });
  },
});

export const getMyAnswer = query({
  args: {
    playerId: v.id("players"),
    questionId: v.optional(v.id("questions")),
  },
  handler: async (ctx, args) => {
    if (!args.questionId) {
      return null;
    }

    return await ctx.db
      .query("answers")
      .withIndex("by_player_question", (q) =>
        q.eq("playerId", args.playerId).eq("questionId", args.questionId as Id<"questions">),
      )
      .first();
  },
});

export const listAnswersForCurrentQuestion = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState?.currentQuestionId) {
      return [];
    }

    return await ctx.db
      .query("answers")
      .withIndex("by_questionId", (q) => q.eq("questionId", gameState.currentQuestionId!))
      .collect();
  },
});

export const scoreAnswer = mutation({
  args: {
    answerId: v.id("answers"),
    isCorrect: v.boolean(),
    pointsAwarded: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.pointsAwarded < 0 || args.pointsAwarded > 999) {
      throw new Error("Kies punten tussen 0 en 999.");
    }

    const answer = await ctx.db.get(args.answerId);

    if (!answer) {
      throw new Error("Antwoord niet gevonden.");
    }

    const player = await ctx.db.get(answer.playerId);

    if (!player) {
      throw new Error("Speler niet gevonden.");
    }

    const previousPoints = answer.pointsAwarded ?? 0;
    const nextPoints = args.isCorrect ? args.pointsAwarded : 0;

    await ctx.db.patch(answer.playerId, {
      score: player.score - previousPoints + nextPoints,
    });

    await ctx.db.patch(args.answerId, {
      isCorrect: args.isCorrect,
      pointsAwarded: nextPoints,
      scoredAt: Date.now(),
    });
  },
});

export const autoScoreCurrentQuestion = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const gameState = await ctx.db
      .query("gameState")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState?.currentQuestionId) {
      throw new Error("Er is geen live vraag.");
    }

    const question = await ctx.db.get(gameState.currentQuestionId);

    if (!question || question.type !== "multiple_choice" || !question.correctOption) {
      throw new Error("Automatisch nakijken kan alleen bij meerkeuze met goed antwoord.");
    }

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_questionId", (q) => q.eq("questionId", question._id))
      .collect();

    const correctAnswers = answers
      .filter((answer) => answer.value === question.correctOption)
      .sort((left, right) => left.submittedAt - right.submittedAt);
    const bonusByAnswerId = new Map<string, number>();

    if (question.speedBonus) {
      [5, 3, 2].forEach((bonus, index) => {
        const answer = correctAnswers[index];
        if (answer) {
          bonusByAnswerId.set(answer._id, bonus);
        }
      });
    }

    for (const answer of answers) {
      const player = await ctx.db.get(answer.playerId);
      if (!player) {
        continue;
      }

      const previousPoints = answer.pointsAwarded ?? 0;
      const isCorrect = answer.value === question.correctOption;
      const nextPoints = isCorrect ? question.points + (bonusByAnswerId.get(answer._id) ?? 0) : 0;

      await ctx.db.patch(answer.playerId, {
        score: player.score - previousPoints + nextPoints,
      });

      await ctx.db.patch(answer._id, {
        isCorrect,
        pointsAwarded: nextPoints,
        scoredAt: Date.now(),
      });
    }
  },
});
