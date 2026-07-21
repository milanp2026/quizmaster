"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon, InfoCard, PageHeader, PageShell, PlayerCard, StatusBadge } from "@/components/quiz-ui";

function initialJoinCode() {
  if (typeof window === "undefined") {
    return "";
  }

  return (new URLSearchParams(window.location.search).get("code") ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);
}

export default function JoinPage() {
  const [code, setCode] = useState(initialJoinCode);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [battleAnswer, setBattleAnswer] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [codeFromUrl] = useState(() => initialJoinCode().length > 0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [joined, setJoined] = useState<{
    gameId: Id<"games">;
    playerId: Id<"players">;
    name: string;
  } | null>(null);

  const joinGame = useMutation(api.quiz.joinGame);
  const keepPlayerOnline = useMutation(api.quiz.keepPlayerOnline);
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
  const activeBattle = useQuery(api.battles.getActiveBattle, joined ? { gameId: joined.gameId } : "skip");
  const battlePlayers = useQuery(
    api.battles.getBattlePlayers,
    activeBattle ? { battleId: activeBattle._id } : "skip",
  );
  const battleVoting = useQuery(
    api.battles.getMyVotingOptions,
    joined && activeBattle ? { battleId: activeBattle._id, voterPlayerId: joined.playerId } : "skip",
  );
  const battleQuestion = useQuery(
    api.battles.getCurrentBattleQuestion,
    activeBattle ? { battleId: activeBattle._id } : "skip",
  );
  const battleAnswers = useQuery(
    api.battles.getBattleAnswers,
    activeBattle ? { battleId: activeBattle._id } : "skip",
  );
  const submitBattleVote = useMutation(api.battles.submitBattleVote);
  const submitBattleAnswer = useMutation(api.battles.submitBattleAnswer);

  useEffect(() => {
    if (!joined) {
      return;
    }

    void keepPlayerOnline({ playerId: joined.playerId }).catch(() => undefined);
    const interval = window.setInterval(() => {
      void keepPlayerOnline({ playerId: joined.playerId }).catch(() => undefined);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [joined, keepPlayerOnline]);

  useEffect(() => {
    if (!game) {
      return;
    }
    const currentGame = game;

    function updateRemaining() {
      if (currentGame.countdownStatus === "running" && currentGame.scheduledStartAt) {
        setRemainingSeconds(Math.max(0, Math.ceil((currentGame.scheduledStartAt - Date.now()) / 1000)));
      } else if (currentGame.countdownStatus === "paused") {
        setRemainingSeconds(currentGame.countdownPausedRemainingSeconds ?? currentGame.countdownDurationSeconds ?? 0);
      } else {
        setRemainingSeconds(currentGame.countdownPausedRemainingSeconds ?? currentGame.countdownDurationSeconds ?? 0);
      }
    }

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 500);
    return () => window.clearInterval(interval);
  }, [game]);

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

  const previewJoinUrl = origin
    ? `${origin}/join${code ? `?code=${code}` : ""}`
    : "";
  const previewQrCodeUrl = previewJoinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
        previewJoinUrl,
      )}`
    : "";

  async function handleOpenAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleAnswer(answer);
  }

  async function handleBattleVote(selectedPlayerId: Id<"players">) {
    if (!joined || !activeBattle || battleVoting?.vote) {
      return;
    }

    setAnswerError("");
    try {
      await submitBattleVote({
        battleId: activeBattle._id,
        voterPlayerId: joined.playerId,
        selectedPlayerId,
      });
    } catch (unknownError) {
      setAnswerError(unknownError instanceof Error ? unknownError.message : "Stemmen is niet gelukt.");
    }
  }

  async function handleBattleAnswer(nextAnswer: string) {
    if (!joined || !activeBattle || !battleQuestion) {
      return;
    }

    setAnswerError("");
    setIsAnswering(true);
    try {
      await submitBattleAnswer({
        battleId: activeBattle._id,
        battleQuestionId: battleQuestion._id,
        playerId: joined.playerId,
        answer: nextAnswer,
      });
      setBattleAnswer("");
    } catch (unknownError) {
      setAnswerError(unknownError instanceof Error ? unknownError.message : "Battle-antwoord is niet gelukt.");
    } finally {
      setIsAnswering(false);
    }
  }

  async function handleOpenBattleAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleBattleAnswer(battleAnswer);
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
    const waitMinutes = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
    const waitSeconds = (remainingSeconds % 60).toString().padStart(2, "0");
    const myBattleAnswer = battleAnswers?.find(
      (nextBattleAnswer) =>
        nextBattleAnswer.playerId === joined.playerId &&
        (!battleQuestion || nextBattleAnswer.battleQuestionId === battleQuestion._id),
    );
    const isBattleParticipant =
      activeBattle?.playerOneId === joined.playerId || activeBattle?.playerTwoId === joined.playerId;
    const battleStatus =
      activeBattle?.phase === "voting"
        ? "Stemmen"
        : activeBattle?.phase === "question_live"
          ? isBattleParticipant
            ? "Battle"
            : "Kijk mee"
          : activeBattle
            ? "Bonus"
            : "";
    const status = gameState?.scoreboardVisible
      ? "Score"
      : activeBattle
        ? battleStatus
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

          {activeBattle ? (
            <section className="space-y-4">
              <InfoCard dark className="bg-[#0D2C4D]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20C6C7]">
                      Bonus Battle
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">1-vs-1</p>
                  </div>
                  <StatusBadge tone="dark">{activeBattle.phase}</StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] bg-white/8 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-white/45">Speler 1</p>
                    <p className="mt-1 truncate text-lg font-black text-white">
                      {battlePlayers?.playerOne?.name ?? "Nog onbekend"}
                    </p>
                    <p className="text-sm font-black text-[#FFC928]">{activeBattle.playerOneWins} wins</p>
                  </div>
                  <div className="rounded-[18px] bg-white/8 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-white/45">Speler 2</p>
                    <p className="mt-1 truncate text-lg font-black text-white">
                      {battlePlayers?.playerTwo?.name ?? "Nog onbekend"}
                    </p>
                    <p className="text-sm font-black text-[#FFC928]">{activeBattle.playerTwoWins} wins</p>
                  </div>
                </div>
              </InfoCard>

              {activeBattle.phase === "voting" ? (
                <InfoCard dark>
                  {battleVoting?.vote ? (
                    <div className="text-center">
                      <p className="text-5xl font-black text-[#FFC928]">OK</p>
                      <p className="mt-2 text-sm font-bold text-white/60">Je stem is binnen.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-lg font-black text-white">Wie moet de battle spelen?</p>
                      {(battleVoting?.options ?? [])
                        .filter((optionPlayer) => optionPlayer !== null)
                        .map((optionPlayer) => (
                        <button
                          className="flex min-h-14 w-full items-center justify-between rounded-[20px] bg-[#071426] px-4 text-left font-black text-white ring-1 ring-white/10"
                          key={optionPlayer._id}
                          onClick={() => handleBattleVote(optionPlayer._id)}
                          type="button"
                        >
                          {optionPlayer.name}
                          <Icon name="arrow" />
                        </button>
                      ))}
                    </div>
                  )}
                </InfoCard>
              ) : null}

              {battleQuestion ? (
                <InfoCard dark>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20C6C7]">
                    Battlevraag
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">{battleQuestion.prompt}</p>

                  {activeBattle.phase === "question_live" && isBattleParticipant && !myBattleAnswer ? (
                    battleQuestion.type === "multiple_choice" ? (
                      <div className="mt-4 grid gap-3">
                        {[
                          ["A", battleQuestion.optionA],
                          ["B", battleQuestion.optionB],
                          ["C", battleQuestion.optionC],
                          ["D", battleQuestion.optionD],
                        ].map(([label, option]) => (
                          <button
                            className="flex min-h-16 items-center gap-3 rounded-[20px] bg-[#071426] px-4 text-left font-black text-white ring-1 ring-white/10 disabled:opacity-50"
                            disabled={isAnswering}
                            key={label}
                            onClick={() => handleBattleAnswer(label ?? "")}
                            type="button"
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFC928] text-[#071426]">
                              {label}
                            </span>
                            <span>{option}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <form className="mt-4 space-y-3" onSubmit={handleOpenBattleAnswer}>
                        <textarea
                          className="min-h-32 w-full rounded-[22px] border-2 border-white/10 bg-[#071426] px-4 py-4 text-lg font-bold text-white outline-none placeholder:text-white/35 focus:border-[#20C6C7]"
                          disabled={isAnswering}
                          onChange={(event) => setBattleAnswer(event.target.value)}
                          placeholder="Typ je battle-antwoord..."
                          value={battleAnswer}
                        />
                        <button
                          className="min-h-14 w-full rounded-[20px] bg-[#FFC928] px-5 font-black text-[#071426] disabled:opacity-60"
                          disabled={isAnswering}
                          type="submit"
                        >
                          Battle-antwoord versturen
                        </button>
                      </form>
                    )
                  ) : null}

                  {activeBattle.phase === "question_live" && !isBattleParticipant ? (
                    <p className="mt-4 text-sm font-bold text-white/60">
                      Je kijkt mee. Alleen de twee gekozen spelers kunnen antwoorden.
                    </p>
                  ) : null}

                  {myBattleAnswer ? (
                    <div className="mt-4 rounded-[18px] bg-white/8 p-4 text-center">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                        Jouw battle-antwoord
                      </p>
                      <p className="mt-1 text-3xl font-black text-[#FFC928]">{myBattleAnswer.answer}</p>
                      <p className="mt-1 text-sm font-bold text-white/55">
                        {(myBattleAnswer.responseTimeMs / 1000).toFixed(2)} sec
                      </p>
                    </div>
                  ) : null}
                </InfoCard>
              ) : null}
            </section>
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
                  <p className="font-black text-white">Je doet mee!</p>
                  <p className="mt-1 text-sm font-bold text-white/55">Wacht tot de quiz begint.</p>
                  <p className="mt-4 text-4xl font-black text-[#FFC928]">
                    {waitMinutes} : {waitSeconds}
                  </p>
                </div>
              </div>
            </InfoCard>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,0,146,0.2),transparent_28%),radial-gradient(circle_at_18%_42%,rgba(0,205,255,0.18),transparent_24%),radial-gradient(circle_at_88%_70%,rgba(255,0,146,0.16),transparent_25%),linear-gradient(180deg,#02030B,#08000F_52%,#02030B)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(ellipse_at_bottom,rgba(0,205,255,0.4),transparent_58%)]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-[26rem] -translate-x-1/2 bg-[repeating-conic-gradient(from_210deg,rgba(0,205,255,0.4)_0deg,transparent_3deg,transparent_8deg,rgba(255,0,146,0.35)_10deg,transparent_13deg)] opacity-45 blur-[1px]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-sm flex-col justify-between gap-4">
        <section className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#FF0AAE] bg-black text-4xl font-black text-white shadow-[0_0_22px_rgba(255,0,174,0.9)]">
            ?
          </div>
          <div className="relative mt-2">
            <h1 className="text-5xl font-black uppercase leading-[0.88] tracking-normal text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.9)]">
              Pubquiz
            </h1>
            <p className="-mt-1 rotate-[-5deg] text-5xl font-black uppercase italic leading-none text-[#FF0A82] drop-shadow-[0_0_14px_rgba(255,0,130,0.65)]">
              Live
            </p>
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/80">
            Speel mee - strijd - win
          </p>
        </section>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="relative rounded-[20px] border border-[#FF0A82] bg-black/72 p-4 shadow-[0_0_30px_rgba(255,0,130,0.35)]">
            <div className="absolute -right-2 -top-24 rounded-xl border border-[#FF0A82] bg-black/80 px-3 py-2 text-center shadow-[0_0_18px_rgba(255,0,130,0.5)]">
              <div className="mx-auto flex h-6 w-8 items-center justify-center text-[#FF0A82]">
                <Icon className="h-5 w-5" name="players" />
              </div>
              <p className="text-2xl font-black leading-none text-white">124</p>
              <p className="mt-1 text-[9px] font-black uppercase leading-tight text-white/80">
                Spelers
                <br />
                online
              </p>
            </div>

            <div className="text-center">
              <p className="text-2xl font-black uppercase leading-none text-white">Scan & doe mee!</p>
              <p className="mt-1 text-xs font-bold text-white/78">Scan de QR-code met je camera</p>
            </div>

            <div className="mx-auto mt-3 w-44 rounded-[14px] bg-[linear-gradient(135deg,#00D5FF,#FFFFFF_34%,#FF0A82)] p-1 shadow-[0_0_26px_rgba(0,213,255,0.7)]">
              <div className="rounded-[10px] bg-white p-2">
                {previewQrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="QR-code voor spelerpagina"
                    className="h-36 w-36"
                    height={144}
                    src={previewQrCodeUrl}
                    width={144}
                  />
                ) : (
                  <div className="h-36 w-36 bg-[repeating-linear-gradient(45deg,#111_0_6px,#fff_6px_12px)]" />
                )}
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] font-black uppercase text-white/80">Of ga naar</p>
            <p className="text-center text-2xl font-black lowercase leading-none text-[#00D5FF] drop-shadow-[0_0_12px_rgba(0,213,255,0.75)]">
              quizmaster.live
            </p>

            <div className="mt-4 grid gap-3">
              {codeFromUrl ? (
                <div className="rounded-[12px] border border-[#FF0A82] bg-black/92 px-4 py-3 text-center shadow-[0_0_18px_rgba(255,0,130,0.45)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FF0A82]">
                    Quiz code
                  </p>
                  <p className="text-3xl font-black uppercase tracking-[0.12em] text-white">{code}</p>
                </div>
              ) : (
                <label className="grid gap-1">
                  <span className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#FF0A82]">
                    Quiz code
                  </span>
                  <input
                    className="h-14 w-full rounded-[12px] border border-[#FF0A82] bg-black/92 px-4 text-center text-3xl font-black uppercase tracking-[0.12em] text-white outline-none shadow-[0_0_18px_rgba(255,0,130,0.45)] placeholder:text-white/25 focus:border-[#00D5FF] focus:shadow-[0_0_18px_rgba(0,213,255,0.6)]"
                    inputMode="text"
                    maxLength={6}
                    onChange={(event) => setCode(event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6))}
                    placeholder="AB12CD"
                    value={code}
                  />
                </label>
              )}

              <label className="grid gap-1">
                <span className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#00D5FF]">
                  Naam
                </span>
                <input
                  className="h-12 w-full rounded-[12px] border border-[#00D5FF] bg-black/92 px-4 text-center text-xl font-black text-white outline-none shadow-[0_0_18px_rgba(0,213,255,0.35)] placeholder:text-white/25 focus:border-[#FF0A82] focus:shadow-[0_0_18px_rgba(255,0,130,0.55)]"
                  maxLength={18}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Je naam"
                  value={name}
                />
              </label>
            </div>
          </div>

          {error ? (
            <div className="rounded-[16px] border border-[#FF0A82] bg-[#2A0015] p-3 text-center text-sm font-black text-[#FFD5EA] shadow-[0_0_18px_rgba(255,0,130,0.3)]">
              {error}
            </div>
          ) : null}

          <div className="rounded-[18px] border border-[#FF0A82] bg-black/74 p-2 shadow-[0_0_26px_rgba(255,0,130,0.35)]">
            <p className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/75">
              De quiz start zodra de quizmaster begint
            </p>
            <button
              className="mt-2 flex min-h-14 w-full items-center justify-center gap-3 rounded-[14px] bg-[linear-gradient(180deg,#FF3B9D,#DB005F)] px-5 text-2xl font-black uppercase text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_24px_rgba(255,0,130,0.65)] transition active:scale-[0.99] disabled:opacity-60"
              disabled={isJoining}
              type="submit"
            >
              <span className="text-3xl leading-none">▶</span>
              {isJoining ? "Bezig..." : "Start"}
            </button>
            <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-white/55">
              Ik doe mee met de quiz
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
