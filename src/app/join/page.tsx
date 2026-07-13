"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon, InfoCard, PageHeader, PageShell, PlayerCard, StatusBadge } from "@/components/quiz-ui";

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
  const gameState = useQuery(api.quiz.getGameState, joined ? { gameId: joined.gameId } : "skip");
  const currentQuestion = useQuery(
    api.quiz.getCurrentQuestion,
    joined ? { gameId: joined.gameId } : "skip",
  );
  const myAnswer = useQuery(
    api.quiz.getMyAnswer,
    joined ? { playerId: joined.playerId, questionId: currentQuestion?._id } : "skip",
  );
  const topPlayers = useQuery(
    api.quiz.listTopPlayers,
    joined ? { gameId: joined.gameId, limit: 10 } : "skip",
  );

  useEffect(() => {
    const nextCode = (new URLSearchParams(window.location.search).get("code") ?? "")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (nextCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(nextCode);
    }
  }, []);

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
    const scoreboard = topPlayers ?? [];
    const status = gameState?.scoreboardVisible
      ? "Score"
      : currentQuestion
        ? gameState?.answersOpen
          ? "Live"
          : "Gesloten"
        : "Lobby";

    return (
      <PageShell dark>
        <div className="space-y-6">
          <PageHeader
            backHref="/"
            dark
            eyebrow={currentQuestion ? "Vraag" : "Wacht op de quizmaster"}
            right={<StatusBadge tone="dark">{status}</StatusBadge>}
            title={gameState?.scoreboardVisible ? "Scorebord" : currentQuestion?.prompt ?? "Je bent binnen"}
          />

          <PlayerCard dark name={player?.name ?? joined.name} />

          {player === null ? (
            <div className="rounded-[22px] bg-[#3A1020] p-4 text-sm font-bold text-[#FFD6DE] ring-1 ring-white/10">
              Deze speler is door de quizmaster verwijderd.
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <InfoCard dark>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Gamecode</p>
              <p className="mt-2 text-2xl font-black tracking-[0.12em] text-[#FFC928]">
                {game?.code ?? code}
              </p>
            </InfoCard>
            <InfoCard dark>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Status</p>
              <p className="mt-2 text-2xl font-black text-white">{status}</p>
              <p className="mt-1 text-xs font-bold text-white/45">Wachten op start</p>
            </InfoCard>
          </div>

          {gameState?.scoreboardVisible ? (
            <section className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20C6C7]">Top 10</p>
              {scoreboard.map((scorePlayer, index) => (
                <PlayerCard
                  dark
                  key={scorePlayer._id}
                  name={scorePlayer.name}
                  rank={index + 1}
                  score={scorePlayer.score}
                />
              ))}
            </section>
          ) : currentQuestion ? (
            <section className="space-y-4">
              {myAnswer ? (
                <InfoCard dark className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20C6C7]">
                    Laatste antwoord
                  </p>
                  <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6D3DF5,#2D77F6)] text-5xl font-black text-white shadow-[0_18px_40px_rgba(45,119,246,0.35)]">
                    {myAnswer.value}
                  </div>
                  <p className="mt-4 text-sm font-bold text-white/58">Wacht op de quizmaster.</p>
                </InfoCard>
              ) : currentQuestion.type === "multiple_choice" ? (
                <div className="grid gap-3">
                  {[
                    ["A", currentQuestion.optionA],
                    ["B", currentQuestion.optionB],
                    ["C", currentQuestion.optionC],
                    ["D", currentQuestion.optionD],
                  ].map(([label, option]) => (
                    <button
                      className="flex min-h-20 items-center gap-4 rounded-[24px] bg-[#10233F] px-4 py-4 text-left shadow-[0_16px_34px_rgba(0,0,0,0.16)] ring-1 ring-white/10 transition active:scale-[0.99] disabled:opacity-50"
                      disabled={!gameState?.answersOpen || isAnswering}
                      key={label}
                      onClick={() => handleAnswer(label ?? "")}
                      type="button"
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FFC928] text-2xl font-black text-[#071426]">
                        {label}
                      </span>
                      <span className="text-lg font-black text-white">{option}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleOpenAnswer}>
                  <textarea
                    className="min-h-36 w-full rounded-[24px] border-2 border-white/10 bg-[#10233F] px-4 py-4 text-xl font-bold text-white outline-none placeholder:text-white/35 focus:border-[#20C6C7]"
                    disabled={!gameState?.answersOpen || isAnswering}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Typ je antwoord..."
                    value={answer}
                  />
                  <button
                    className="min-h-16 w-full rounded-[24px] bg-[#FFC928] px-6 text-xl font-black text-[#071426] shadow-[0_18px_38px_rgba(255,201,40,0.25)] disabled:opacity-60"
                    disabled={!gameState?.answersOpen || isAnswering}
                    type="submit"
                  >
                    Antwoord versturen
                  </button>
                </form>
              )}

              {answerError ? (
                <div className="rounded-[22px] bg-[#3A1020] p-4 text-sm font-bold text-[#FFD6DE] ring-1 ring-white/10">
                  {answerError}
                </div>
              ) : null}

              {!gameState?.answersOpen && !myAnswer ? (
                <InfoCard dark>Antwoorden zijn gesloten.</InfoCard>
              ) : null}
            </section>
          ) : (
            <InfoCard dark>
              <div className="flex gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#FFC928]">
                  <Icon name="star" />
                </span>
                <div>
                  <p className="font-black text-white">Wacht tot de quizmaster begint.</p>
                  <p className="mt-1 text-sm font-bold text-white/55">Tip: Zorg dat je naam uniek is!</p>
                </div>
              </div>
            </InfoCard>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell dark>
      <div className="space-y-8">
        <PageHeader
          backHref="/"
          dark
          eyebrow="Meedoen"
          right={<StatusBadge tone="dark">Lobby</StatusBadge>}
          subtitle="Vul de gamecode in, kies een naam en speel direct mee zonder account."
          title="Join de quiz"
        />

        <form className="space-y-4" onSubmit={handleSubmit}>
          <InfoCard dark>
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#20C6C7]">
                  Gamecode
                </span>
                <input
                  className="h-16 w-full rounded-[22px] border-2 border-white/10 bg-[#071426] px-5 text-center text-3xl font-black tracking-[0.2em] text-[#FFC928] outline-none placeholder:text-white/20 focus:border-[#20C6C7]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  value={code}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#20C6C7]">
                  Naam
                </span>
                <input
                  className="h-16 w-full rounded-[22px] border-2 border-white/10 bg-[#071426] px-5 text-xl font-bold text-white outline-none placeholder:text-white/25 focus:border-[#20C6C7]"
                  maxLength={24}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Je naam"
                  value={name}
                />
              </label>
            </div>
          </InfoCard>

          {error ? (
            <div className="rounded-[22px] bg-[#3A1020] p-4 text-sm font-bold text-[#FFD6DE] ring-1 ring-white/10">
              {error}
            </div>
          ) : null}

          <button
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[24px] bg-[#FFC928] px-6 text-xl font-black text-[#071426] shadow-[0_18px_38px_rgba(255,201,40,0.25)] transition active:scale-[0.99] disabled:opacity-60"
            disabled={isJoining}
            type="submit"
          >
            {isJoining ? "Bezig..." : "Meedoen"}
            <Icon name="arrow" />
          </button>
        </form>

        <InfoCard dark>
          <div className="flex gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#FFC928]">
              <Icon name="bolt" />
            </span>
            <p className="text-sm font-bold leading-6 text-white/65">
              Tip: Zorg dat je naam uniek is, dan ziet de quizmaster meteen wie jij bent.
            </p>
          </div>
        </InfoCard>
      </div>
    </PageShell>
  );
}
