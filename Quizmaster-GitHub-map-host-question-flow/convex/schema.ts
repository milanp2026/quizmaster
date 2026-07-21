import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    code: v.string(),
    masterPin: v.string(),
    status: v.string(),
    createdAt: v.number(),
    livePhase: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    currentQuestionStartedAt: v.optional(v.number()),
    currentAnswerDeadline: v.optional(v.number()),
    currentQuestionNumber: v.optional(v.number()),
    scheduledStartAt: v.optional(v.number()),
    countdownDurationSeconds: v.optional(v.number()),
    countdownStatus: v.optional(v.string()),
    countdownPausedRemainingSeconds: v.optional(v.number()),
    autoStartEnabled: v.optional(v.boolean()),
    joinOpen: v.optional(v.boolean()),
  }).index("by_code", ["code"]),

  players: defineTable({
    gameId: v.id("games"),
    name: v.string(),
    score: v.number(),
    joinedAt: v.number(),
    lastSeenAt: v.optional(v.number()),
    active: v.optional(v.boolean()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_score", ["gameId", "score"]),

  hostSessions: defineTable({
    gameId: v.id("games"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_gameId", ["gameId"]),

  hostLoginAttempts: defineTable({
    gameId: v.id("games"),
    attempts: v.number(),
    lastAttemptAt: v.number(),
    blockedUntil: v.optional(v.number()),
  }).index("by_gameId", ["gameId"]),

  gameState: defineTable({
    gameId: v.id("games"),
    phase: v.string(),
    currentQuestionId: v.optional(v.id("questions")),
    scoreboardVisible: v.optional(v.boolean()),
    answersOpen: v.optional(v.boolean()),
  }).index("by_gameId", ["gameId"]),

  questions: defineTable({
    gameId: v.id("games"),
    prompt: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("open")),
    optionA: v.optional(v.string()),
    optionB: v.optional(v.string()),
    optionC: v.optional(v.string()),
    optionD: v.optional(v.string()),
    correctOption: v.optional(v.string()),
    category: v.optional(v.string()),
    points: v.number(),
    answerDurationSeconds: v.optional(v.number()),
    explanation: v.optional(v.string()),
    order: v.optional(v.number()),
    speedBonus: v.boolean(),
    status: v.string(),
    createdAt: v.number(),
    liveAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_status", ["gameId", "status"]),

  answers: defineTable({
    gameId: v.id("games"),
    questionId: v.id("questions"),
    playerId: v.id("players"),
    playerName: v.string(),
    value: v.string(),
    submittedAt: v.number(),
    reactionMs: v.optional(v.number()),
    isCorrect: v.optional(v.boolean()),
    pointsAwarded: v.optional(v.number()),
    scoredAt: v.optional(v.number()),
  })
    .index("by_questionId", ["questionId"])
    .index("by_player_question", ["playerId", "questionId"]),

  battles: defineTable({
    gameId: v.id("games"),
    status: v.string(),
    phase: v.string(),
    votingStartedAt: v.optional(v.number()),
    votingEndsAt: v.optional(v.number()),
    questionStartedAt: v.optional(v.number()),
    answerDeadline: v.optional(v.number()),
    playerOneId: v.optional(v.id("players")),
    playerTwoId: v.optional(v.id("players")),
    currentBattleQuestionId: v.optional(v.id("battleQuestions")),
    totalQuestions: v.number(),
    questionsPlayed: v.number(),
    playerOneWins: v.number(),
    playerTwoWins: v.number(),
    winnerId: v.optional(v.id("players")),
    pointsPerCorrect: v.number(),
    winnerBonus: v.number(),
    loserPoints: v.number(),
    votingDurationSeconds: v.number(),
    answerDurationSeconds: v.number(),
    questionType: v.string(),
    judgingMode: v.string(),
    pointsAwarded: v.boolean(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_status", ["gameId", "status"]),

  battleVotingOptions: defineTable({
    battleId: v.id("battles"),
    voterPlayerId: v.id("players"),
    optionPlayerIds: v.array(v.id("players")),
    createdAt: v.number(),
  })
    .index("by_battleId", ["battleId"])
    .index("by_battle_voter", ["battleId", "voterPlayerId"]),

  battleVotes: defineTable({
    battleId: v.id("battles"),
    voterPlayerId: v.id("players"),
    selectedPlayerId: v.id("players"),
    createdAt: v.number(),
  })
    .index("by_battleId", ["battleId"])
    .index("by_battle_voter", ["battleId", "voterPlayerId"])
    .index("by_battle_selected", ["battleId", "selectedPlayerId"]),

  battleQuestions: defineTable({
    battleId: v.id("battles"),
    prompt: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("open"), v.literal("photo")),
    optionA: v.optional(v.string()),
    optionB: v.optional(v.string()),
    optionC: v.optional(v.string()),
    optionD: v.optional(v.string()),
    correctOption: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
  }).index("by_battleId", ["battleId"]),

  battleAnswers: defineTable({
    battleId: v.id("battles"),
    battleQuestionId: v.id("battleQuestions"),
    playerId: v.id("players"),
    answer: v.string(),
    submittedAt: v.number(),
    responseTimeMs: v.number(),
    isCorrect: v.optional(v.boolean()),
    awardedPoints: v.optional(v.number()),
  })
    .index("by_battleId", ["battleId"])
    .index("by_battle_question", ["battleId", "battleQuestionId"])
    .index("by_question_player", ["battleQuestionId", "playerId"]),

  playerBattleStats: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    battlesPlayed: v.number(),
    battlesWon: v.number(),
    lastBattleAt: v.optional(v.number()),
    timesShownInVoting: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_playerId", ["playerId"])
    .index("by_game_player", ["gameId", "playerId"]),
});
