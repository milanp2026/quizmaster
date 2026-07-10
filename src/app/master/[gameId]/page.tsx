"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type QuestionType = "multiple_choice" | "open";

export default function MasterGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId as Id<"games">;
  const game = useQuery(api.quiz.getGame, { gameId });
  const players = useQuery(api.quiz.listPlayers, { gameId });
  const gameState = useQuery(api.quiz.getGameState, { gameId });
  const questions = useQuery(api.quiz.listQuestions, { gameId });
  const currentQuestion = useQuery(api.quiz.getCurrentQuestion, { gameId });
  const answers = useQuery(api.quiz.listAnswersForCurrentQuestion, { gameId });
  const createQuestion = useMutation(api.quiz.createQuestion);
  const publishQuestion = useMutation(api.quiz.publishQuestion);
  const closeAnswers = useMutation(api.quiz.closeAnswers);
  const scoreAnswer = useMutation(api.quiz.scoreAnswer);
  const autoScoreCurrentQuestion = useMutation(api.quiz.autoScoreCurrentQuestion);
  const setScoreboardVisible = useMutation(api.quiz.setScoreboardVisible);
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("A");
  const [points, setPoints] = useState(10);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const sortedPlayers = useMemo(
    () => (players ?? []).slice().sort((left, right) => left.joinedAt - right.joinedAt),
    [players],
  );
  const scoreboard = useMemo(
    () => (players ?? []).slice().sort((left, right) => right.score - left.score),
    [players],
  );
  const sortedAnswers = useMemo(
    () => (answers ?? []).slice().sort((left, right) => left.submittedAt - right.submittedAt),
    [answers],
  );
  const draftQuestions = useMemo(
    () => (questions ?? []).filter((question) => question.status === "draft"),
    [questions],
  );

  async function runAction(actionName: string, action: () => Promise<unknown>) {
    setError("");
    setBusy(actionName);

    try {
      await action();
    } catch (unknownError) {
      setError(
        unknownError instanceof Error ? unknownError.message : "Actie is niet gelukt.",
      );
    } finally {
      setBusy("");
    }
  }

  async function handleCreateQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await runAction("createQuestion", async () => {
      await createQuestion({
        gameId,
        prompt,
        type,
        optionA: type === "multiple_choice" ? optionA : undefined,
        optionB: type === "multiple_choice" ? optionB : undefined,
        optionC: type === "multiple_choice" ? optionC : undefined,
        optionD: type === "multiple_choice" ? optionD : undefined,
        correctOption: type === "multiple_choice" ? correctOption : undefined,
        points,
        speedBonus,
      });

      setPrompt("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
    });
  }

  function answerAge(submittedAt: number) {
    if (!currentQuestion?.liveAt) {
      return "";
    }

    return `${((submittedAt - currentQuestion.liveAt) / 1000).toFixed(1)} sec`;
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-[#1f2933]">
      <section className="mx-auto flex w-full max-w-sm flex-col gap-6 pb-8">
        <Link className="text-sm font-semibold text-[#256f62]" href="/">
          Terug naar home
        </Link>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d6d]">
            Quizmaster
          </p>
          <h1 className="text-4xl font-bold leading-tight">Wacht op spelers.</h1>
        </div>

        <div className="rounded-lg bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#52606d]">Gamecode</p>
          <p className="mt-2 text-5xl font-black tracking-[0.14em]">{game?.code ?? "------"}</p>
          <p className="mt-3 text-sm font-medium text-[#52606d]">
            Status: {gameState?.phase ?? game?.status ?? "laden"}
          </p>
        </div>

        {error ? (
          <p className="rounded-lg bg-[#fff1f0] p-4 text-sm font-semibold text-[#b42318]">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold">Spelers</h2>
            <p className="text-sm font-semibold text-[#52606d]">{players?.length ?? 0} online</p>
          </div>

          <div className="space-y-3">
            {players === undefined ? (
              <p className="rounded-lg bg-white p-4 text-[#52606d] shadow-sm">Spelers laden...</p>
            ) : players.length === 0 ? (
              <p className="rounded-lg bg-white p-4 text-[#52606d] shadow-sm">
                Nog geen spelers. Deel de gamecode.
              </p>
            ) : (
              sortedPlayers.map((player, index) => (
                <div
                  className="flex min-h-14 items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm"
                  key={player._id}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef7f4] text-sm font-bold text-[#256f62]">
                    {index + 1}
                  </span>
                  <span className="text-lg font-semibold">{player.name}</span>
                  <span className="ml-auto text-sm font-bold text-[#52606d]">{player.score} pt</span>
                </div>
              ))
            )}
          </div>
        </div>

        <form className="space-y-4 rounded-lg bg-white p-5 shadow-sm" onSubmit={handleCreateQuestion}>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Nieuwe vraag</h2>
            <p className="text-sm font-medium text-[#52606d]">
              Maak alvast de volgende vraag terwijl spelers bezig zijn.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#52606d]">Vraag</span>
            <textarea
              className="min-h-24 w-full rounded-lg border-2 border-[#d9e2ec] px-4 py-3 text-lg font-semibold outline-none focus:border-[#256f62]"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Typ je vraag..."
              value={prompt}
            />
          </label>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#eef7f4] p-1">
            <button
              className={`min-h-12 rounded-md text-sm font-bold ${
                type === "multiple_choice" ? "bg-[#256f62] text-white" : "text-[#256f62]"
              }`}
              onClick={() => setType("multiple_choice")}
              type="button"
            >
              A/B/C/D
            </button>
            <button
              className={`min-h-12 rounded-md text-sm font-bold ${
                type === "open" ? "bg-[#256f62] text-white" : "text-[#256f62]"
              }`}
              onClick={() => setType("open")}
              type="button"
            >
              Open vraag
            </button>
          </div>

          {type === "multiple_choice" ? (
            <div className="grid gap-3">
              {[
                ["A", optionA, setOptionA],
                ["B", optionB, setOptionB],
                ["C", optionC, setOptionC],
                ["D", optionD, setOptionD],
              ].map(([label, value, setter]) => (
                <label className="flex items-center gap-3" key={label as string}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef7f4] font-black text-[#256f62]">
                    {label as string}
                  </span>
                  <input
                    className="h-12 min-w-0 flex-1 rounded-lg border-2 border-[#d9e2ec] px-3 font-semibold outline-none focus:border-[#256f62]"
                    onChange={(event) =>
                      (setter as (nextValue: string) => void)(event.target.value)
                    }
                    placeholder={`Antwoord ${label}`}
                    value={value as string}
                  />
                </label>
              ))}

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[#52606d]">Goed antwoord</span>
                <select
                  className="h-12 w-full rounded-lg border-2 border-[#d9e2ec] bg-white px-3 font-bold outline-none focus:border-[#256f62]"
                  onChange={(event) => setCorrectOption(event.target.value)}
                  value={correctOption}
                >
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                  <option>D</option>
                </select>
              </label>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-[#52606d]">Punten</span>
              <input
                className="h-12 w-full rounded-lg border-2 border-[#d9e2ec] px-3 text-lg font-bold outline-none focus:border-[#256f62]"
                min={0}
                onChange={(event) => setPoints(Number(event.target.value))}
                type="number"
                value={points}
              />
            </label>
            <label className="flex items-end gap-3 rounded-lg border-2 border-[#d9e2ec] p-3">
              <input
                checked={speedBonus}
                className="h-6 w-6 accent-[#256f62]"
                onChange={(event) => setSpeedBonus(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm font-bold text-[#52606d]">Snelheidsbonus</span>
            </label>
          </div>

          <button
            className="min-h-14 w-full rounded-lg bg-[#256f62] px-5 text-lg font-bold text-white disabled:bg-[#9fb8b2]"
            disabled={busy === "createQuestion"}
            type="submit"
          >
            Vraag klaarzetten
          </button>
        </form>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Conceptvragen</h2>
          {draftQuestions.length === 0 ? (
            <p className="rounded-lg bg-white p-4 text-[#52606d] shadow-sm">
              Nog geen conceptvraag.
            </p>
          ) : (
            draftQuestions.map((question) => (
              <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm" key={question._id}>
                <p className="text-lg font-bold">{question.prompt}</p>
                <p className="text-sm font-semibold text-[#52606d]">{question.points} punten</p>
                <button
                  className="min-h-12 w-full rounded-lg bg-[#1f2933] px-4 font-bold text-white disabled:bg-[#9aa5b1]"
                  disabled={busy === question._id}
                  onClick={() =>
                    runAction(question._id, () => publishQuestion({ questionId: question._id }))
                  }
                  type="button"
                >
                  Toon vraag
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold">Live vraag</h2>
            <p className="text-sm font-bold text-[#52606d]">{sortedAnswers.length} antwoorden</p>
          </div>

          {currentQuestion ? (
            <div className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
              <p className="text-xl font-black">{currentQuestion.prompt}</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-bold text-[#52606d]">
                <span>{currentQuestion.points} punten</span>
                <span>{gameState?.answersOpen ? "Open" : "Gesloten"}</span>
              </div>
              <button
                className="min-h-12 w-full rounded-lg bg-[#b42318] px-4 font-bold text-white disabled:bg-[#d0a19c]"
                disabled={!gameState?.answersOpen || busy === "closeAnswers"}
                onClick={() => runAction("closeAnswers", () => closeAnswers({ gameId }))}
                type="button"
              >
                Sluit antwoorden
              </button>
              <button
                className="min-h-12 w-full rounded-lg bg-[#256f62] px-4 font-bold text-white disabled:bg-[#9fb8b2]"
                disabled={currentQuestion.type !== "multiple_choice" || busy === "autoScore"}
                onClick={() => runAction("autoScore", () => autoScoreCurrentQuestion({ gameId }))}
                type="button"
              >
                Meerkeuze automatisch nakijken
              </button>
            </div>
          ) : (
            <p className="rounded-lg bg-white p-4 text-[#52606d] shadow-sm">
              Zet een conceptvraag live.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Antwoorden</h2>
          {sortedAnswers.length === 0 ? (
            <p className="rounded-lg bg-white p-4 text-[#52606d] shadow-sm">
              Nog geen antwoorden.
            </p>
          ) : (
            sortedAnswers.map((answer) => (
              <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm" key={answer._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black">{answer.playerName}</p>
                    <p className="text-sm font-semibold text-[#52606d]">{answerAge(answer.submittedAt)}</p>
                  </div>
                  <span className="rounded-lg bg-[#eef7f4] px-3 py-2 text-lg font-black text-[#256f62]">
                    {answer.value}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="min-h-11 rounded-lg bg-[#256f62] px-3 text-sm font-bold text-white"
                    onClick={() =>
                      runAction(answer._id, () =>
                        scoreAnswer({
                          answerId: answer._id,
                          isCorrect: true,
                          pointsAwarded: currentQuestion?.points ?? 10,
                        }),
                      )
                    }
                    type="button"
                  >
                    Goed +{currentQuestion?.points ?? 10}
                  </button>
                  <button
                    className="min-h-11 rounded-lg bg-[#f3f4f6] px-3 text-sm font-bold text-[#52606d]"
                    onClick={() =>
                      runAction(answer._id, () =>
                        scoreAnswer({ answerId: answer._id, isCorrect: false, pointsAwarded: 0 }),
                      )
                    }
                    type="button"
                  >
                    Fout
                  </button>
                </div>
                <p className="text-sm font-semibold text-[#52606d]">
                  Toegekend: {answer.pointsAwarded ?? 0} punten
                </p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Score</h2>
            <button
              className="rounded-lg bg-[#1f2933] px-4 py-3 text-sm font-bold text-white"
              onClick={() =>
                runAction("scoreboard", () =>
                  setScoreboardVisible({ gameId, visible: !gameState?.scoreboardVisible }),
                )
              }
              type="button"
            >
              {gameState?.scoreboardVisible ? "Verberg" : "Toon"}
            </button>
          </div>
          {scoreboard.map((player, index) => (
            <div
              className="flex min-h-14 items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm"
              key={player._id}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef7f4] font-black text-[#256f62]">
                {index + 1}
              </span>
              <span className="text-lg font-bold">{player.name}</span>
              <span className="ml-auto text-lg font-black">{player.score}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
