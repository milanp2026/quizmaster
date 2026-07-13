import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    code: v.string(),
    masterPin: v.string(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  players: defineTable({
    gameId: v.id("games"),
    name: v.string(),
    score: v.number(),
    joinedAt: v.number(),
    active: v.optional(v.boolean()),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_score", ["gameId", "score"]),

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
    points: v.number(),
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
});
