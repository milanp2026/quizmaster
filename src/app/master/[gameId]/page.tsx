"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  BottomNavigation,
  GameCodeCard,
  Icon,
  InfoCard,
  PageHeader,
  PageShell,
  PlayerCard,
  StatusBadge,
} from "@/components/quiz-ui";

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
  const renamePlayer = useMutation(api.quiz.renamePlayer);
  const removePlayer = useMutation(api.quiz.removePlayer);
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
  const [editingPlayerId, setEditingPlayerId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

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
  const joinUrl = origin && game?.code ? `${origin}/join?code=${game.code}` : "";
  const qrCodeUrl = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(
        joinUrl,
      )}`
    : "";

  async function runAction(actionName: string, action: () => Promise<unknown>) {
    setError("");
    setBusy(actionName);

    try {
      await action();
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Actie is niet gelukt.");
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

  async function handleRenamePlayer(playerId: Id<"players">) {
    await runAction(`rename-${playerId}`, async () => {
      await renamePlayer({ playerId, name: editingName });
      setEditingPlayerId("");
      setEditingName("");
    });
  }

  return (
    <PageShell withBottomSpace>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Quizmaster"
          right={<StatusBadge tone="blue">{gameState?.phase ?? "Lobby"}</StatusBadge>}
          subtitle="Beheer je live quiz, spelers, vragen en score vanuit een mobiel dashboard."
          title="Dashboard"
        />

        <GameCodeCard
          code={game?.code ?? "------"}
          helper="Laat spelers de code invullen of scan de QR-code."
        />

        {qrCodeUrl ? (
          <InfoCard>
            <div className="grid gap-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6D3DF5]">
                Spelerpagina
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="QR-code voor spelerpagina"
                className="mx-auto h-44 w-44 rounded-[24px] border border-[#E5EAF2] bg-white p-3 shadow-sm"
                height={176}
                src={qrCodeUrl}
                width={176}
              />
              <p className="break-all text-xs font-bold text-[#667085]">{joinUrl}</p>
            </div>
          </InfoCard>
        ) : null}

        {error ? (
          <div className="rounded-[22px] bg-[#FFF1F0] p-4 text-sm font-bold text-[#B42318] ring-1 ring-[#FEE4E2]">
            {error}
          </div>
        ) : null}

        <section className="space-y-3" id="spelers">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6D3DF5]">Live</p>
              <h2 className="text-2xl font-black text-[#10233F]">Spelers</h2>
            </div>
            <StatusBadge tone="yellow">{players?.length ?? 0} online</StatusBadge>
          </div>

          {players === undefined ? (
            <InfoCard>Spelers laden...</InfoCard>
          ) : players.length === 0 ? (
            <InfoCard>Nog geen spelers. Deel de gamecode of QR-code.</InfoCard>
          ) : (
            <div className="grid gap-3">
              {sortedPlayers.map((player, index) => (
                <PlayerCard
                  key={player._id}
                  name={player.name}
                  rank={index + 1}
                  score={player.score}
                  actions={
                    editingPlayerId === player._id ? (
                      <div className="grid gap-2">
                        <input
                          className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-4 font-bold outline-none focus:border-[#8C4DFF]"
                          maxLength={24}
                          onChange={(event) => setEditingName(event.target.value)}
                          value={editingName}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className="min-h-12 rounded-[18px] bg-[#6D3DF5] px-3 text-sm font-black text-white"
                            onClick={() => handleRenamePlayer(player._id)}
                            type="button"
                          >
                            Opslaan
                          </button>
                          <button
                            className="min-h-12 rounded-[18px] bg-[#F5F7FB] px-3 text-sm font-black text-[#667085]"
                            onClick={() => {
                              setEditingPlayerId("");
                              setEditingName("");
                            }}
                            type="button"
                          >
                            Annuleer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="min-h-12 rounded-[18px] bg-[#F0EEFF] px-3 text-sm font-black text-[#6D3DF5]"
                          onClick={() => {
                            setEditingPlayerId(player._id);
                            setEditingName(player.name);
                          }}
                          type="button"
                        >
                          Naam
                        </button>
                        <button
                          className="min-h-12 rounded-[18px] bg-[#FFF1F0] px-3 text-sm font-black text-[#B42318]"
                          onClick={() =>
                            runAction(`remove-${player._id}`, () => removePlayer({ playerId: player._id }))
                          }
                          type="button"
                        >
                          Verwijder
                        </button>
                      </div>
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>

        <form className="space-y-4" onSubmit={handleCreateQuestion}>
          <InfoCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6D3DF5]">
                    Volgende ronde
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-[#10233F]">Nieuwe vraag</h2>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4C7] text-[#10233F]">
                  <Icon name="star" />
                </span>
              </div>

              <textarea
                className="min-h-28 w-full rounded-[22px] border-2 border-[#E5EAF2] px-4 py-4 text-lg font-bold outline-none focus:border-[#8C4DFF]"
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Typ je vraag..."
                value={prompt}
              />

              <div className="grid grid-cols-2 gap-2 rounded-[22px] bg-[#F5F7FB] p-1.5">
                <button
                  className={`min-h-12 rounded-[18px] text-sm font-black ${
                    type === "multiple_choice" ? "bg-[#6D3DF5] text-white shadow-sm" : "text-[#667085]"
                  }`}
                  onClick={() => setType("multiple_choice")}
                  type="button"
                >
                  A/B/C/D
                </button>
                <button
                  className={`min-h-12 rounded-[18px] text-sm font-black ${
                    type === "open" ? "bg-[#6D3DF5] text-white shadow-sm" : "text-[#667085]"
                  }`}
                  onClick={() => setType("open")}
                  type="button"
                >
                  Open
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
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0EEFF] text-lg font-black text-[#6D3DF5]">
                        {label as string}
                      </span>
                      <input
                        className="h-12 min-w-0 flex-1 rounded-[18px] border-2 border-[#E5EAF2] px-3 font-bold outline-none focus:border-[#8C4DFF]"
                        onChange={(event) => (setter as (nextValue: string) => void)(event.target.value)}
                        placeholder={`Antwoord ${label}`}
                        value={value as string}
                      />
                    </label>
                  ))}

                  <select
                    className="h-12 rounded-[18px] border-2 border-[#E5EAF2] bg-white px-4 font-black outline-none focus:border-[#8C4DFF]"
                    onChange={(event) => setCorrectOption(event.target.value)}
                    value={correctOption}
                  >
                    <option value="A">A is goed</option>
                    <option value="B">B is goed</option>
                    <option value="C">C is goed</option>
                    <option value="D">D is goed</option>
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Punten</span>
                  <input
                    className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-4 text-lg font-black outline-none focus:border-[#8C4DFF]"
                    min={0}
                    onChange={(event) => setPoints(Number(event.target.value))}
                    type="number"
                    value={points}
                  />
                </label>
                <label className="flex min-h-16 items-center gap-3 rounded-[20px] border-2 border-[#E5EAF2] p-3">
                  <input
                    checked={speedBonus}
                    className="h-6 w-6 accent-[#6D3DF5]"
                    onChange={(event) => setSpeedBonus(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm font-black text-[#667085]">Snelheid</span>
                </label>
              </div>

              <button
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[22px] bg-[#FFC928] px-5 font-black text-[#071426] shadow-[0_16px_34px_rgba(255,201,40,0.3)] disabled:opacity-60"
                disabled={busy === "createQuestion"}
                type="submit"
              >
                Vraag klaarzetten
                <Icon name="arrow" />
              </button>
            </div>
          </InfoCard>
        </form>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-[#10233F]">Conceptvragen</h2>
          {draftQuestions.length === 0 ? (
            <InfoCard>Nog geen conceptvraag.</InfoCard>
          ) : (
            draftQuestions.map((question) => (
              <InfoCard key={question._id}>
                <p className="text-lg font-black text-[#10233F]">{question.prompt}</p>
                <p className="mt-1 text-sm font-bold text-[#667085]">{question.points} punten</p>
                <button
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#10233F] px-4 font-black text-white disabled:opacity-60"
                  disabled={busy === question._id}
                  onClick={() => runAction(question._id, () => publishQuestion({ questionId: question._id }))}
                  type="button"
                >
                  Toon vraag
                  <Icon name="arrow" />
                </button>
              </InfoCard>
            ))
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-black text-[#10233F]">Live vraag</h2>
            <StatusBadge tone="blue">{sortedAnswers.length} antwoorden</StatusBadge>
          </div>

          {currentQuestion ? (
            <InfoCard>
              <p className="text-xl font-black text-[#10233F]">{currentQuestion.prompt}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="min-h-12 rounded-[18px] bg-[#FFF1F0] px-4 font-black text-[#B42318] disabled:opacity-60"
                  disabled={!gameState?.answersOpen || busy === "closeAnswers"}
                  onClick={() => runAction("closeAnswers", () => closeAnswers({ gameId }))}
                  type="button"
                >
                  Sluit
                </button>
                <button
                  className="min-h-12 rounded-[18px] bg-[#6D3DF5] px-4 font-black text-white disabled:opacity-60"
                  disabled={currentQuestion.type !== "multiple_choice" || busy === "autoScore"}
                  onClick={() => runAction("autoScore", () => autoScoreCurrentQuestion({ gameId }))}
                  type="button"
                >
                  Nakijken
                </button>
              </div>
            </InfoCard>
          ) : (
            <InfoCard>Zet een conceptvraag live.</InfoCard>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-black text-[#10233F]">Antwoorden</h2>
          {sortedAnswers.length === 0 ? (
            <InfoCard>Nog geen antwoorden.</InfoCard>
          ) : (
            sortedAnswers.map((answer) => (
              <InfoCard key={answer._id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-[#10233F]">{answer.playerName}</p>
                    <p className="text-sm font-bold text-[#667085]">
                      {answer.reactionMs !== undefined ? `${(answer.reactionMs / 1000).toFixed(1)} sec` : "Tijd onbekend"}
                    </p>
                  </div>
                  <span className="flex h-14 min-w-14 items-center justify-center rounded-full bg-[#F0EEFF] px-4 text-2xl font-black text-[#6D3DF5]">
                    {answer.value}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="min-h-12 rounded-[18px] bg-[#20C6C7] px-3 text-sm font-black text-[#071426]"
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
                    className="min-h-12 rounded-[18px] bg-[#F5F7FB] px-3 text-sm font-black text-[#667085]"
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
              </InfoCard>
            ))
          )}
        </section>

        <section className="space-y-3" id="score">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-[#10233F]">Volledige ranglijst</h2>
            <button
              className="min-h-11 rounded-full bg-[#10233F] px-4 text-sm font-black text-white"
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
            <PlayerCard key={player._id} name={player.name} rank={index + 1} score={player.score} />
          ))}
        </section>
      </div>
      <BottomNavigation active="Dashboard" />
    </PageShell>
  );
}
