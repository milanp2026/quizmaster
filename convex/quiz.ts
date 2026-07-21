import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

function createGameCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function normalizePlayerName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeGameCode(code: string) {
  return code.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function isPlayerActive(player: { active?: boolean }) {
  return player.active !== false;
}

function hasBlockedWord(name: string) {
  const blockedWords = ["kanker", "kk", "kut", "hoer", "nazi", "hitler", "mongool"];
  const lowerName = name.toLowerCase();
  return blockedWords.some((word) => lowerName.includes(word));
}

function speedBonusForRank(rank: number) {
  return [5, 3, 2][rank] ?? 0;
}

function createSessionToken() {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";

  for (let index = 0; index < 48; index += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return token;
}

async function getGameStateByGameId(ctx: MutationCtx | QueryCtx, gameId: Id<"games">) {
  return await ctx.db
    .query("gameState")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .first();
}

async function validateHostToken(ctx: MutationCtx | QueryCtx, gameId: Id<"games">, token: string) {
  if (!token) {
    return null;
  }

  const session = await ctx.db.query("hostSessions").withIndex("by_token", (q) => q.eq("token", token)).first();
  if (!session || session.gameId !== gameId || session.expiresAt < Date.now()) {
    return null;
  }

  return session;
}

async function requireHostSession(ctx: MutationCtx, gameId: Id<"games">, token: string) {
  const session = await validateHostToken(ctx, gameId, token);
  if (!session) {
    throw new Error("Hostsessie is verlopen. Log opnieuw in.");
  }

  await ctx.db.patch(session._id, { lastUsedAt: Date.now() });
  return session;
}

async function getLoginAttempts(ctx: MutationCtx, gameId: Id<"games">) {
  const existing = await ctx.db
    .query("hostLoginAttempts")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .first();

  if (existing) {
    return existing;
  }

  const attemptId = await ctx.db.insert("hostLoginAttempts", {
    gameId,
    attempts: 0,
    lastAttemptAt: Date.now(),
  });

  return (await ctx.db.get(attemptId)) as Doc<"hostLoginAttempts">;
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
      countdownStatus: "idle",
      countdownDurationSeconds: 0,
      autoStartEnabled: false,
      joinOpen: true,
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
    const code = normalizeGameCode(args.code);
    const baseName = normalizePlayerName(args.name);

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      throw new Error("Voer een gamecode van 6 tekens in.");
    }

    if (baseName.length < 2 || baseName.length > 18) {
      throw new Error("Gebruik een nickname van 2 tot 18 tekens.");
    }

    if (!/^[\p{L}\p{N}\p{Emoji}\s_]+$/u.test(baseName)) {
      throw new Error("Gebruik letters, cijfers, spaties, underscores of emoji.");
    }

    if (hasBlockedWord(baseName)) {
      throw new Error("Kies een andere nickname.");
    }

    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!game) {
      throw new Error("Geen game gevonden met deze code.");
    }

    if (game.joinOpen === false || game.status === "finished") {
      throw new Error("Meedoen is gesloten.");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .collect();

    const usedNames = new Set(
      players.filter(isPlayerActive).map((player) => player.name.toLowerCase()),
    );
    const playerName = baseName;

    if (usedNames.has(playerName.toLowerCase())) {
      throw new Error("Deze nickname is al in gebruik.");
    }

    const playerId = await ctx.db.insert("players", {
      gameId: game._id,
      name: playerName,
      score: 0,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      active: true,
    });

    return {
      gameId: game._id,
      playerId,
      name: playerName,
    };
  },
});

export const getGameByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeGameCode(args.code);
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      return null;
    }

    return await ctx.db.query("games").withIndex("by_code", (q) => q.eq("code", code)).first();
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

export const validateHostSession = query({
  args: {
    gameId: v.id("games"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await validateHostToken(ctx, args.gameId, args.token);
    return {
      valid: Boolean(session),
      expiresAt: session?.expiresAt ?? null,
    };
  },
});

export const createHostSession = mutation({
  args: {
    gameId: v.id("games"),
    masterPin: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    const attempts = await getLoginAttempts(ctx, args.gameId);
    const timestamp = Date.now();

    if (attempts.blockedUntil && attempts.blockedUntil > timestamp) {
      throw new Error("Wacht even voordat je opnieuw probeert.");
    }

    if (!game || game.masterPin !== args.masterPin) {
      const nextAttempts = attempts.attempts + 1;
      await ctx.db.patch(attempts._id, {
        attempts: nextAttempts,
        lastAttemptAt: timestamp,
        blockedUntil: nextAttempts >= 3 ? timestamp + 2500 : undefined,
      });
      throw new Error("De pincode is niet juist");
    }

    await ctx.db.patch(attempts._id, {
      attempts: 0,
      lastAttemptAt: timestamp,
      blockedUntil: undefined,
    });

    const token = createSessionToken();
    const expiresAt = timestamp + 1000 * 60 * 60 * 4;
    await ctx.db.insert("hostSessions", {
      gameId: args.gameId,
      token,
      createdAt: timestamp,
      expiresAt,
      lastUsedAt: timestamp,
    });

    return { token, expiresAt };
  },
});

export const getLiveLobby = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const code = normalizeGameCode(args.code);
    const game = await ctx.db.query("games").withIndex("by_code", (q) => q.eq("code", code)).first();

    if (!game) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId", (q) => q.eq("gameId", game._id))
      .collect();
    const gameState = await getGameStateByGameId(ctx, game._id);

    return {
      game,
      gameState,
      playerCount: players.filter(isPlayerActive).filter((player) => player.name.trim().length > 0).length,
    };
  },
});

export const getPlayer = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    return player && isPlayerActive(player) ? player : null;
  },
});

export const keepPlayerOnline = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player || !isPlayerActive(player)) {
      throw new Error("Speler niet gevonden.");
    }

    await ctx.db.patch(args.playerId, {
      lastSeenAt: Date.now(),
    });
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
      .filter((q) => q.neq(q.field("active"), false))
      .collect();
  },
});

export const listTopPlayers = query({
  args: {
    gameId: v.id("games"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 10);
    const players = await ctx.db
      .query("players")
      .withIndex("by_gameId_score", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .collect();

    return players.filter(isPlayerActive).slice(0, limit);
  },
});

export const renamePlayer = mutation({
  args: {
    playerId: v.id("players"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    const name = normalizePlayerName(args.name);

    if (!player || !isPlayerActive(player)) {
      throw new Error("Speler niet gevonden.");
    }

    if (name.length < 2 || name.length > 24) {
      throw new Error("Gebruik een naam van 2 tot 24 tekens.");
    }

    await ctx.db.patch(args.playerId, { name });
  },
});

export const removePlayer = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);

    if (!player) {
      throw new Error("Speler niet gevonden.");
    }

    await ctx.db.patch(args.playerId, {
      active: false,
      name: `Verwijderd ${args.playerId.slice(-4)}`,
    });
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

export const setCountdown = mutation({
  args: {
    gameId: v.id("games"),
    hostSessionToken: v.string(),
    durationSeconds: v.number(),
    autoStartEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireHostSession(ctx, args.gameId, args.hostSessionToken);

    const durationSeconds = Math.min(Math.max(Math.floor(args.durationSeconds), 0), 60 * 60);
    await ctx.db.patch(args.gameId, {
      countdownDurationSeconds: durationSeconds,
      countdownPausedRemainingSeconds: durationSeconds,
      countdownStatus: durationSeconds > 0 ? "ready" : "idle",
      scheduledStartAt: undefined,
      autoStartEnabled: args.autoStartEnabled,
      status: "lobby",
      joinOpen: true,
    });
  },
});

export const startCountdown = mutation({
  args: {
    gameId: v.id("games"),
    hostSessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHostSession(ctx, args.gameId, args.hostSessionToken);
    const game = await ctx.db.get(args.gameId);

    const durationSeconds =
      game?.countdownPausedRemainingSeconds ?? game?.countdownDurationSeconds ?? 0;
    if (durationSeconds <= 0) {
      throw new Error("Stel eerst een afteltijd in.");
    }

    const scheduledStartAt = Date.now() + durationSeconds * 1000;
    await ctx.db.patch(args.gameId, {
      scheduledStartAt,
      countdownDurationSeconds: durationSeconds,
      countdownPausedRemainingSeconds: undefined,
      countdownStatus: "running",
      status: "countdown",
      joinOpen: true,
    });

    const gameState = await getGameStateByGameId(ctx, args.gameId);
    if (gameState) {
      await ctx.db.patch(gameState._id, { phase: "countdown" });
    }
  },
});

export const pauseCountdown = mutation({
  args: {
    gameId: v.id("games"),
    hostSessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHostSession(ctx, args.gameId, args.hostSessionToken);
    const game = await ctx.db.get(args.gameId);

    const remainingSeconds = Math.max(
      0,
      Math.ceil(((game?.scheduledStartAt ?? Date.now()) - Date.now()) / 1000),
    );

    await ctx.db.patch(args.gameId, {
      countdownPausedRemainingSeconds: remainingSeconds,
      scheduledStartAt: undefined,
      countdownStatus: "paused",
      status: "paused",
    });
  },
});

export const resetCountdown = mutation({
  args: {
    gameId: v.id("games"),
    hostSessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHostSession(ctx, args.gameId, args.hostSessionToken);
    const game = await ctx.db.get(args.gameId);

    await ctx.db.patch(args.gameId, {
      scheduledStartAt: undefined,
      countdownPausedRemainingSeconds: game?.countdownDurationSeconds ?? 0,
      countdownStatus: (game?.countdownDurationSeconds ?? 0) > 0 ? "ready" : "idle",
      status: "lobby",
      joinOpen: true,
    });

    const gameState = await getGameStateByGameId(ctx, args.gameId);
    if (gameState) {
      await ctx.db.patch(gameState._id, { phase: "lobby" });
    }
  },
});

export const startQuizNow = mutation({
  args: {
    gameId: v.id("games"),
    hostSessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    await requireHostSession(ctx, args.gameId, args.hostSessionToken);

    await ctx.db.patch(args.gameId, {
      status: "live",
      countdownStatus: "finished",
      scheduledStartAt: undefined,
      countdownPausedRemainingSeconds: 0,
      joinOpen: true,
    });

    const gameState = await getGameStateByGameId(ctx, args.gameId);
    if (gameState) {
      await ctx.db.patch(gameState._id, { phase: "live" });
    }
  },
});

export const autoStartIfDue = mutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || !game.autoStartEnabled || game.countdownStatus !== "running") {
      return false;
    }
    if (!game.scheduledStartAt || game.scheduledStartAt > Date.now()) {
      return false;
    }

    await ctx.db.patch(args.gameId, {
      status: "live",
      countdownStatus: "finished",
      scheduledStartAt: undefined,
      countdownPausedRemainingSeconds: 0,
    });

    const gameState = await getGameStateByGameId(ctx, args.gameId);
    if (gameState) {
      await ctx.db.patch(gameState._id, { phase: "live" });
    }

    return true;
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

    if (!player || player.gameId !== args.gameId || !isPlayerActive(player)) {
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

    const submittedAt = Date.now();

    return await ctx.db.insert("answers", {
      gameId: args.gameId,
      questionId: args.questionId,
      playerId: args.playerId,
      playerName: player.name,
      value,
      submittedAt,
      reactionMs: Math.max(0, submittedAt - (question.liveAt ?? submittedAt)),
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
    let nextPoints = args.isCorrect ? args.pointsAwarded : 0;

    if (args.isCorrect) {
      const question = await ctx.db.get(answer.questionId);

      if (question?.speedBonus) {
        const answers = await ctx.db
          .query("answers")
          .withIndex("by_questionId", (q) => q.eq("questionId", answer.questionId))
          .collect();
        const approvedAnswers = answers
          .filter((currentAnswer) => currentAnswer.isCorrect === true || currentAnswer._id === args.answerId)
          .sort((left, right) => left.submittedAt - right.submittedAt);
        const rank = approvedAnswers.findIndex((currentAnswer) => currentAnswer._id === args.answerId);
        nextPoints += speedBonusForRank(rank);
      }
    }

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
