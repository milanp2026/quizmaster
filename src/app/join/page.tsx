"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [joined, setJoined] = useState<{
    gameId: Id<"games">;
    playerId: Id<"players">;
    name: string;
  } | null>(null);

  const joinGame = useMutation(api.quiz.joinGame);
  const submitAnswer = useMutation(api.quiz.submitAnswer);
  const game = useQuery(api.quiz.getGame, joined ? { gameId: joined.gameId } : "skip");
  const player = useQuery(api.quiz.getPlayer, joined ? { playerId: joined.playerId } : "skip");
  const gameState = useQuery(
    api.quiz.getGameState,
    joined ? { gameId: joined.gameId } : "skip",
  );
  const currentQuestion = useQuery(
    api.quiz.getCurrentQuestion,
    joined ? { gameId: joined.gameId } : "skip",
  );
  const myAnswer = useQuery(
    api.quiz.getMyAnswer,
    joined ? { playerId: joined.playerId, questionId: currentQuestion?._id } : "skip",
  );
  const players = useQuery(api.quiz.listPlayers, joined ? { gameId: joined.gameId } : "skip");

  async function handleAnswer(nextAnswer: string) {
    if (!joined || !currentQuestion || myAnswer) {
      return;
    }

    setAnswerError("");
    setIsAnswering(true);

    try {
      await submitAnswer({
        gameId: joined.gameId,
        playerId: joined.playerId,
        questionId: currentQuestion._id,
        value: nextAnswer,
      });
      setAnswer("");
    } catch (unknownError) {
      setAnswerError(
        unknownError instanceof Error ? unknownError.message : "Antwoord versturen is niet gelukt.",
      );
    } finally {
      setIsAnswering(false);
    }
  }

  async function handleOpenAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAnswer(answer);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsJoining(true);

    try {
      const result = await joinGame({ code, name });
      setJoined(result);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Meedoen is niet gelukt.");
    } finally {
      setIsJoining(false);
    }
  }

  if (joined) {
    const scoreboard = (players ?? []).slice().sort((left, right) => right.score - left.score);

    return (
      <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-[#1f2933]">
        <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-sm flex-col gap-6">
          <div className="space-y-6">
            <Link className="text-sm font-semibold text-[#256f62]" href="/">
              Terug naar home
            </Link>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d6d]">
                {gameState?.scoreboardVisible
                  ? "Tussenstand"
                  : currentQuestion
                    ? "Vraag"
                    : "Wachtkamer"}
              </p>
              <h1 className="text-4xl font-bold leading-tight">
                {gameState?.scoreboardVisible
                  ? "Scorebord"
                  : currentQuestion
                    ? currentQuestion.prompt
                    : "Je bent binnen."}
              </h1>
              {!currentQuestion && !gameState?.scoreboardVisible ? (
                <p className="text-lg text-[#52606d]">
                  Je naam staat nu live op het scherm van de quizmaster.
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-[#52606d]">Speler</p>
              <p className="text-3xl font-bold">{player?.name ?? joined.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#52606d]">Gamecode</p>
                <p className="mt-1 text-2xl font-bold tracking-[0.12em]">{game?.code ?? code}</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-[#52606d]">Status</p>
                <p className="mt-1 text-2xl font-bold capitalize">{gameState?.phase ?? "lobby"}</p>
              </div>
            </div>
          </div>

          {gameState?.scoreboardVisible ? (
            <div className="space-y-3">
              {scoreboard.map((scorePlayer, index) => (
                <div
                  className="flex min-h-14 items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm"
                  key={scorePlayer._id}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef7f4] text-sm font-black text-[#256f62]">
                    {index + 1}
                  </span>
                  <span className="text-lg font-bold">{scorePlayer.name}</span>
                  <span className="ml-auto text-lg font-black">{scorePlayer.score}</span>
                </div>
              ))}
            </div>
          ) : currentQuestion ? (
            <div className="space-y-4">
              {myAnswer ? (
                <div className="space-y-3 rounded-lg bg-white p-5 text-center shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d6d]">
                    Antwoord ontvangen
                  </p>
                  <p className="text-4xl font-black">{myAnswer.value}</p>
                  <p className="text-sm font-medium text-[#52606d]">
                    Wacht op de quizmaster.
                  </p>
                </div>
              ) : currentQuestion.type === "multiple_choice" ? (
                <div className="grid gap-3">
                  {[
                    ["A", currentQuestion.optionA],
                    ["B", currentQuestion.optionB],
                    ["C", currentQuestion.optionC],
                    ["D", currentQuestion.optionD],
                  ].map(([label, option]) => (
                    <button
                      className="flex min-h-16 items-center gap-3 rounded-lg bg-white px-4 py-4 text-left shadow-sm disabled:opacity-60"
                      disabled={!gameState?.answersOpen || isAnswering}
                      key={label}
                      onClick={() => handleAnswer(label ?? "")}
                      type="button"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef7f4] text-lg font-black text-[#256f62]">
                        {label}
                      </span>
                      <span className="text-lg font-bold">{option}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleOpenAnswer}>
                  <textarea
                    className="min-h-32 w-full rounded-lg border-2 border-transparent bg-white px-4 py-4 text-xl font-semibold shadow-sm outline-none focus:border-[#256f62]"
                    disabled={!gameState?.answersOpen || isAnswering}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Typ je antwoord..."
                    value={answer}
                  />
                  <button
                    className="min-h-16 w-full rounded-lg bg-[#256f62] px-6 py-5 text-xl font-semibold text-white shadow-sm disabled:bg-[#9fb8b2]"
                    disabled={!gameState?.answersOpen || isAnswering}
                    type="submit"
                  >
                    Antwoord versturen
                  </button>
                </form>
              )}

              {answerError ? (
                <p className="rounded-lg bg-[#fff1f0] p-4 text-sm font-semibold text-[#b42318]">
                  {answerError}
                </p>
              ) : null}

              {!gameState?.answersOpen && !myAnswer ? (
                <p className="rounded-lg bg-[#fff1f0] p-4 text-center text-sm font-semibold text-[#b42318]">
                  Antwoorden zijn gesloten.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg bg-[#eef7f4] p-4 text-center text-sm font-medium text-[#256f62]">
              Wacht tot de quizmaster begint.
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-[#1f2933]">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-sm flex-col justify-between gap-8">
        <div className="space-y-6">
          <Link className="text-sm font-semibold text-[#256f62]" href="/">
            Terug naar home
          </Link>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d6d]">
              Meedoen
            </p>
            <h1 className="text-4xl font-bold leading-tight">Vul je code en naam in.</h1>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#52606d]">Gamecode</span>
            <input
              className="h-16 w-full rounded-lg border-2 border-transparent bg-white px-5 text-center text-3xl font-bold tracking-[0.2em] shadow-sm outline-none transition focus:border-[#256f62]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              value={code}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#52606d]">Naam</span>
            <input
              className="h-16 w-full rounded-lg border-2 border-transparent bg-white px-5 text-xl font-semibold shadow-sm outline-none transition focus:border-[#256f62]"
              maxLength={24}
              onChange={(event) => setName(event.target.value)}
              placeholder="Je naam"
              value={name}
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-[#fff1f0] p-4 text-sm font-semibold text-[#b42318]">
              {error}
            </p>
          ) : null}

          <button
            className="min-h-16 w-full rounded-lg bg-[#256f62] px-6 py-5 text-xl font-semibold text-white shadow-sm transition-colors hover:bg-[#1f5f54] focus:outline-none focus:ring-4 focus:ring-[#256f62]/25 disabled:cursor-not-allowed disabled:bg-[#9fb8b2]"
            disabled={isJoining}
            type="submit"
          >
            {isJoining ? "Bezig..." : "Meedoen"}
          </button>
        </form>
      </section>
    </main>
  );
}
