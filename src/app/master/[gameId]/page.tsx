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
type BattleQuestionType = "multiple_choice" | "open" | "photo";
type BattleJudgingMode = "automatic" | "manual";

export default function MasterGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId as Id<"games">;
  const game = useQuery(api.quiz.getGame, { gameId });
  const players = useQuery(api.quiz.listPlayers, { gameId });
  const gameState = useQuery(api.quiz.getGameState, { gameId });
  const questions = useQuery(api.quiz.listQuestions, { gameId });
  const currentQuestion = useQuery(api.quiz.getCurrentQuestion, { gameId });
  const answers = useQuery(api.quiz.listAnswersForCurrentQuestion, { gameId });
  const activeBattle = useQuery(api.battles.getActiveBattle, { gameId });
  const battlePlayers = useQuery(
    api.battles.getBattlePlayers,
    activeBattle ? { battleId: activeBattle._id } : "skip",
  );
  const battleVotes = useQuery(
    api.battles.getBattleVotes,
    activeBattle ? { battleId: activeBattle._id } : "skip",
  );
  const battleQuestion = useQuery(
    api.battles.getCurrentBattleQuestion,
    activeBattle ? { battleId: activeBattle._id } : "skip",
  );
  const battleAnswers = useQuery(
    api.battles.getBattleAnswers,
    activeBattle ? { battleId: activeBattle._id } : "skip",
  );
  const createQuestion = useMutation(api.quiz.createQuestion);
  const publishQuestion = useMutation(api.quiz.publishQuestion);
  const closeAnswers = useMutation(api.quiz.closeAnswers);
  const scoreAnswer = useMutation(api.quiz.scoreAnswer);
  const autoScoreCurrentQuestion = useMutation(api.quiz.autoScoreCurrentQuestion);
  const setScoreboardVisible = useMutation(api.quiz.setScoreboardVisible);
  const renamePlayer = useMutation(api.quiz.renamePlayer);
  const removePlayer = useMutation(api.quiz.removePlayer);
  const startBattle = useMutation(api.battles.startBattle);
  const finishBattleVoting = useMutation(api.battles.finishVoting);
  const confirmBattlePlayers = useMutation(api.battles.confirmBattlePlayers);
  const createBattleQuestion = useMutation(api.battles.createBattleQuestion);
  const closeBattleQuestion = useMutation(api.battles.closeBattleQuestion);
  const judgeBattleAnswer = useMutation(api.battles.judgeBattleAnswer);
  const completeBattleQuestion = useMutation(api.battles.completeBattleQuestion);
  const awardBattlePoints = useMutation(api.battles.awardBattlePoints);
  const cancelBattle = useMutation(api.battles.cancelBattle);
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
  const [battleTotalQuestions, setBattleTotalQuestions] = useState(1);
  const [battlePointsPerCorrect, setBattlePointsPerCorrect] = useState(10);
  const [battleWinnerBonus, setBattleWinnerBonus] = useState(20);
  const [battleLoserPoints, setBattleLoserPoints] = useState(5);
  const [battleVotingSeconds, setBattleVotingSeconds] = useState(10);
  const [battleAnswerSeconds, setBattleAnswerSeconds] = useState(15);
  const [battleQuestionType, setBattleQuestionType] = useState<BattleQuestionType>("multiple_choice");
  const [battleJudgingMode, setBattleJudgingMode] = useState<BattleJudgingMode>("automatic");
  const [battlePrompt, setBattlePrompt] = useState("");
  const [battleOptionA, setBattleOptionA] = useState("");
  const [battleOptionB, setBattleOptionB] = useState("");
  const [battleOptionC, setBattleOptionC] = useState("");
  const [battleOptionD, setBattleOptionD] = useState("");
  const [battleCorrectOption, setBattleCorrectOption] = useState("A");
  const [battlePlayerOneId, setBattlePlayerOneId] = useState("");
  const [battlePlayerTwoId, setBattlePlayerTwoId] = useState("");

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
  const liveScreenUrl = origin && game?._id ? `${origin}/host/live-screen/${game._id}` : "";
  const publicLiveUrl = origin && game?.code ? `${origin}/live/${game.code}` : "";
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

  async function handleStartBattle() {
    await runAction("startBattle", () =>
      startBattle({
        gameId,
        totalQuestions: battleTotalQuestions,
        pointsPerCorrect: battlePointsPerCorrect,
        winnerBonus: battleWinnerBonus,
        loserPoints: battleLoserPoints,
        votingDurationSeconds: battleVotingSeconds,
        answerDurationSeconds: battleAnswerSeconds,
        questionType: battleQuestionType,
        judgingMode: battleJudgingMode,
      }),
    );
  }

  async function handleCreateBattleQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeBattle) {
      return;
    }

    await runAction("createBattleQuestion", async () => {
      await createBattleQuestion({
        battleId: activeBattle._id,
        prompt: battlePrompt,
        type: battleQuestionType,
        optionA: battleQuestionType === "multiple_choice" ? battleOptionA : undefined,
        optionB: battleQuestionType === "multiple_choice" ? battleOptionB : undefined,
        optionC: battleQuestionType === "multiple_choice" ? battleOptionC : undefined,
        optionD: battleQuestionType === "multiple_choice" ? battleOptionD : undefined,
        correctOption:
          battleQuestionType === "multiple_choice" && battleJudgingMode === "automatic"
            ? battleCorrectOption
            : undefined,
      });
      setBattlePrompt("");
      setBattleOptionA("");
      setBattleOptionB("");
      setBattleOptionC("");
      setBattleOptionD("");
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
              <a
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(135deg,#FF0A78,#A855F7)] px-5 font-black text-white shadow-[0_16px_34px_rgba(255,10,120,0.25)]"
                href={liveScreenUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open TikTok-scherm
                <Icon name="arrow" />
              </a>
              <p className="break-all text-xs font-bold text-[#667085]">
                OBS display-link: {publicLiveUrl}
              </p>
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

        <section className="space-y-3" id="bonus-battle">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6D3DF5]">
                TikTok LIVE voorbereid
              </p>
              <h2 className="text-2xl font-black text-[#10233F]">Bonus Battle</h2>
            </div>
            <StatusBadge tone="yellow">{activeBattle?.phase ?? "Uit"}</StatusBadge>
          </div>

          <InfoCard>
            {!activeBattle ? (
              <div className="space-y-4">
                <p className="text-sm font-bold leading-6 text-[#667085]">
                  Laat alle actieve spelers stemmen op twee deelnemers. Nieuwe spelers kunnen blijven aansluiten.
                </p>

                <div className="grid grid-cols-3 gap-2 rounded-[22px] bg-[#F5F7FB] p-1.5">
                  {[
                    ["1 vraag", 1],
                    ["Best of 3", 3],
                    ["Best of 5", 5],
                  ].map(([label, value]) => (
                    <button
                      className={`min-h-12 rounded-[18px] text-sm font-black ${
                        battleTotalQuestions === value ? "bg-[#6D3DF5] text-white shadow-sm" : "text-[#667085]"
                      }`}
                      key={value}
                      onClick={() => setBattleTotalQuestions(value as number)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Goed</span>
                    <input
                      className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-4 font-black outline-none focus:border-[#8C4DFF]"
                      min={0}
                      onChange={(event) => setBattlePointsPerCorrect(Number(event.target.value))}
                      type="number"
                      value={battlePointsPerCorrect}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Winnaar</span>
                    <input
                      className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-4 font-black outline-none focus:border-[#8C4DFF]"
                      min={0}
                      onChange={(event) => setBattleWinnerBonus(Number(event.target.value))}
                      type="number"
                      value={battleWinnerBonus}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Verliezer</span>
                    <input
                      className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-4 font-black outline-none focus:border-[#8C4DFF]"
                      min={0}
                      onChange={(event) => setBattleLoserPoints(Number(event.target.value))}
                      type="number"
                      value={battleLoserPoints}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Antwoordtijd</span>
                    <input
                      className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-4 font-black outline-none focus:border-[#8C4DFF]"
                      min={5}
                      onChange={(event) => setBattleAnswerSeconds(Number(event.target.value))}
                      type="number"
                      value={battleAnswerSeconds}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Stemmen</span>
                    <input
                      className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-4 font-black outline-none focus:border-[#8C4DFF]"
                      min={5}
                      onChange={(event) => setBattleVotingSeconds(Number(event.target.value))}
                      type="number"
                      value={battleVotingSeconds}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Nakijken</span>
                    <select
                      className="h-12 rounded-[18px] border-2 border-[#E5EAF2] bg-white px-3 font-black outline-none focus:border-[#8C4DFF]"
                      onChange={(event) => setBattleJudgingMode(event.target.value as BattleJudgingMode)}
                      value={battleJudgingMode}
                    >
                      <option value="automatic">Automatisch</option>
                      <option value="manual">Handmatig</option>
                    </select>
                  </label>
                </div>

                <button
                  className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[22px] bg-[#20C6C7] px-5 font-black text-[#071426] shadow-[0_16px_34px_rgba(32,198,199,0.25)] disabled:opacity-60"
                  disabled={busy === "startBattle" || sortedPlayers.length < 2}
                  onClick={handleStartBattle}
                  type="button"
                >
                  Start Bonus Battle
                  <Icon name="bolt" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard className="bg-[#F0EEFF] shadow-none">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#6D3DF5]">Speler 1</p>
                    <p className="mt-1 text-lg font-black text-[#10233F]">
                      {battlePlayers?.playerOne?.name ?? "Nog niet gekozen"}
                    </p>
                    <p className="text-sm font-black text-[#667085]">{activeBattle.playerOneWins} wins</p>
                  </InfoCard>
                  <InfoCard className="bg-[#E9FBFB] shadow-none">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#008C8D]">Speler 2</p>
                    <p className="mt-1 text-lg font-black text-[#10233F]">
                      {battlePlayers?.playerTwo?.name ?? "Nog niet gekozen"}
                    </p>
                    <p className="text-sm font-black text-[#667085]">{activeBattle.playerTwoWins} wins</p>
                  </InfoCard>
                </div>

                {activeBattle.phase === "voting" ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-[#667085]">
                      Spelers stemmen nu op wie de 1-vs-1 battle speelt.
                    </p>
                    {(battleVotes ?? []).slice(0, 5).map((voteRow) => (
                      <div
                        className="flex items-center justify-between rounded-[18px] bg-[#F5F7FB] px-4 py-3"
                        key={voteRow.playerId}
                      >
                        <span className="font-black text-[#10233F]">{voteRow.player?.name ?? "Speler"}</span>
                        <span className="font-black text-[#6D3DF5]">{voteRow.votes}</span>
                      </div>
                    ))}
                    <button
                      className="min-h-12 w-full rounded-[18px] bg-[#6D3DF5] px-4 font-black text-white"
                      onClick={() => runAction("finishBattleVoting", () => finishBattleVoting({ battleId: activeBattle._id }))}
                      type="button"
                    >
                      Stemmen afronden
                    </button>
                  </div>
                ) : null}

                {activeBattle.phase === "confirming_players" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        className="h-12 min-w-0 rounded-[18px] border-2 border-[#E5EAF2] bg-white px-2 font-black outline-none focus:border-[#8C4DFF]"
                        onChange={(event) => setBattlePlayerOneId(event.target.value)}
                        value={battlePlayerOneId || activeBattle.playerOneId}
                      >
                        {sortedPlayers.map((player) => (
                          <option key={player._id} value={player._id}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="h-12 min-w-0 rounded-[18px] border-2 border-[#E5EAF2] bg-white px-2 font-black outline-none focus:border-[#8C4DFF]"
                        onChange={(event) => setBattlePlayerTwoId(event.target.value)}
                        value={battlePlayerTwoId || activeBattle.playerTwoId}
                      >
                        {sortedPlayers.map((player) => (
                          <option key={player._id} value={player._id}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      className="min-h-12 w-full rounded-[18px] bg-[#10233F] px-4 font-black text-white"
                      onClick={() =>
                        runAction("confirmBattlePlayers", () =>
                          confirmBattlePlayers({
                            battleId: activeBattle._id,
                            playerOneId: (battlePlayerOneId || activeBattle.playerOneId) as Id<"players">,
                            playerTwoId: (battlePlayerTwoId || activeBattle.playerTwoId) as Id<"players">,
                          }),
                        )
                      }
                      type="button"
                    >
                      Deelnemers bevestigen
                    </button>
                  </div>
                ) : null}

                {["countdown", "question_result"].includes(activeBattle.phase) ? (
                  <form className="space-y-3" onSubmit={handleCreateBattleQuestion}>
                    <textarea
                      className="min-h-24 w-full rounded-[22px] border-2 border-[#E5EAF2] px-4 py-4 text-lg font-bold outline-none focus:border-[#8C4DFF]"
                      onChange={(event) => setBattlePrompt(event.target.value)}
                      placeholder="Typ de battlevraag..."
                      value={battlePrompt}
                    />
                    <select
                      className="h-12 w-full rounded-[18px] border-2 border-[#E5EAF2] bg-white px-4 font-black outline-none focus:border-[#8C4DFF]"
                      onChange={(event) => setBattleQuestionType(event.target.value as BattleQuestionType)}
                      value={battleQuestionType}
                    >
                      <option value="multiple_choice">A/B/C/D</option>
                      <option value="open">Open vraag</option>
                      <option value="photo">Foto-vraag</option>
                    </select>
                    {battleQuestionType === "multiple_choice" ? (
                      <div className="grid gap-2">
                        {[
                          ["A", battleOptionA, setBattleOptionA],
                          ["B", battleOptionB, setBattleOptionB],
                          ["C", battleOptionC, setBattleOptionC],
                          ["D", battleOptionD, setBattleOptionD],
                        ].map(([label, value, setter]) => (
                          <input
                            className="h-12 rounded-[18px] border-2 border-[#E5EAF2] px-3 font-bold outline-none focus:border-[#8C4DFF]"
                            key={label as string}
                            onChange={(event) => (setter as (nextValue: string) => void)(event.target.value)}
                            placeholder={`Antwoord ${label}`}
                            value={value as string}
                          />
                        ))}
                        <select
                          className="h-12 rounded-[18px] border-2 border-[#E5EAF2] bg-white px-4 font-black outline-none focus:border-[#8C4DFF]"
                          onChange={(event) => setBattleCorrectOption(event.target.value)}
                          value={battleCorrectOption}
                        >
                          <option value="A">A is goed</option>
                          <option value="B">B is goed</option>
                          <option value="C">C is goed</option>
                          <option value="D">D is goed</option>
                        </select>
                      </div>
                    ) : null}
                    <button
                      className="min-h-12 w-full rounded-[18px] bg-[#FFC928] px-4 font-black text-[#071426]"
                      type="submit"
                    >
                      Battlevraag live zetten
                    </button>
                  </form>
                ) : null}

                {battleQuestion ? (
                  <div className="rounded-[20px] bg-[#F5F7FB] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Live battlevraag</p>
                    <p className="mt-1 text-lg font-black text-[#10233F]">{battleQuestion.prompt}</p>
                  </div>
                ) : null}

                {activeBattle.phase === "question_live" ? (
                  <button
                    className="min-h-12 w-full rounded-[18px] bg-[#FFF1F0] px-4 font-black text-[#B42318]"
                    onClick={() => runAction("closeBattleQuestion", () => closeBattleQuestion({ battleId: activeBattle._id }))}
                    type="button"
                  >
                    Battlevraag sluiten
                  </button>
                ) : null}

                {["judging", "question_result", "finished"].includes(activeBattle.phase) ? (
                  <div className="space-y-3">
                    {(battleAnswers ?? []).map((battleAnswer) => (
                      <div className="rounded-[18px] bg-[#F5F7FB] p-3" key={battleAnswer._id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-[#10233F]">
                              {battleAnswer.playerId === activeBattle.playerOneId
                                ? battlePlayers?.playerOne?.name
                                : battlePlayers?.playerTwo?.name}
                            </p>
                            <p className="text-sm font-bold text-[#667085]">
                              {battleAnswer.answer} · {(battleAnswer.responseTimeMs / 1000).toFixed(2)} sec
                            </p>
                          </div>
                          <StatusBadge tone={battleAnswer.isCorrect ? "yellow" : "blue"}>
                            {battleAnswer.isCorrect === undefined ? "Open" : battleAnswer.isCorrect ? "Goed" : "Fout"}
                          </StatusBadge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            className="min-h-11 rounded-[16px] bg-[#20C6C7] px-3 text-sm font-black text-[#071426]"
                            onClick={() =>
                              runAction(`battle-good-${battleAnswer._id}`, () =>
                                judgeBattleAnswer({
                                  answerId: battleAnswer._id,
                                  isCorrect: true,
                                  awardedPoints: activeBattle.pointsPerCorrect,
                                }),
                              )
                            }
                            type="button"
                          >
                            Goed
                          </button>
                          <button
                            className="min-h-11 rounded-[16px] bg-white px-3 text-sm font-black text-[#667085]"
                            onClick={() =>
                              runAction(`battle-wrong-${battleAnswer._id}`, () =>
                                judgeBattleAnswer({
                                  answerId: battleAnswer._id,
                                  isCorrect: false,
                                  awardedPoints: 0,
                                }),
                              )
                            }
                            type="button"
                          >
                            Fout
                          </button>
                        </div>
                      </div>
                    ))}
                    {activeBattle.phase === "judging" ? (
                      <button
                        className="min-h-12 w-full rounded-[18px] bg-[#6D3DF5] px-4 font-black text-white"
                        onClick={() => runAction("completeBattleQuestion", () => completeBattleQuestion({ battleId: activeBattle._id }))}
                        type="button"
                      >
                        Uitslag van deze vraag
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {activeBattle.phase === "finished" ? (
                  <button
                    className="min-h-12 w-full rounded-[18px] bg-[#FFC928] px-4 font-black text-[#071426]"
                    onClick={() => runAction("awardBattlePoints", () => awardBattlePoints({ battleId: activeBattle._id }))}
                    type="button"
                  >
                    Punten toevoegen aan ranglijst
                  </button>
                ) : null}

                <button
                  className="min-h-11 w-full rounded-[18px] bg-[#FFF1F0] px-4 text-sm font-black text-[#B42318]"
                  onClick={() => runAction("cancelBattle", () => cancelBattle({ battleId: activeBattle._id }))}
                  type="button"
                >
                  Bonus Battle stoppen
                </button>
              </div>
            )}
          </InfoCard>
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
