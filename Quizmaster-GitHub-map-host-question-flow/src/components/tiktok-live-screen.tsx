"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Icon } from "@/components/quiz-ui";

function secondsRemaining(game: Doc<"games">) {
  if (game.countdownStatus === "paused") {
    return game.countdownPausedRemainingSeconds ?? game.countdownDurationSeconds ?? 0;
  }

  if (game.countdownStatus === "running" && game.scheduledStartAt) {
    return Math.max(0, Math.ceil((game.scheduledStartAt - Date.now()) / 1000));
  }

  return game.countdownPausedRemainingSeconds ?? game.countdownDurationSeconds ?? 0;
}

function formatTime(totalSeconds: number) {
  return {
    minutes: Math.floor(totalSeconds / 60).toString().padStart(2, "0"),
    seconds: Math.max(0, totalSeconds % 60).toString().padStart(2, "0"),
  };
}

function publicAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  return typeof window === "undefined" ? "" : window.location.origin;
}

function displayDomain(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "") || "quizmaster.live";
  } catch {
    return "quizmaster.live";
  }
}

export function HostPinLogin({
  gameId,
  onAuthenticated,
}: {
  gameId: Id<"games">;
  onAuthenticated: (token: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [masterPin, setMasterPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createHostSession = useMutation(api.quiz.createHostSession);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const session = await createHostSession({ gameId, masterPin });
      window.sessionStorage.setItem(`quizmaster-host-session:${gameId}`, session.token);
      onAuthenticated(session.token);
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "De pincode is niet juist");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#030306] px-5 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,10,120,0.2),transparent_26%),radial-gradient(circle_at_18%_70%,rgba(0,231,240,0.18),transparent_28%),linear-gradient(180deg,#030306,#080014)]" />
      <form
        className="relative z-10 w-full max-w-md rounded-[28px] border border-[#FF0A78] bg-[#080810]/90 p-6 shadow-[0_0_42px_rgba(255,10,120,0.34)]"
        onSubmit={handleSubmit}
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00E7F0]">PubQuiz Live</p>
        <h1 className="mt-3 text-4xl font-black text-white">Quizmaster toegang</h1>
        <p className="mt-3 text-base font-bold leading-7 text-white/68">
          Vul je pincode in om het livescherm te bedienen
        </p>

        <label className="mt-6 block space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#FF0A78]">Pincode</span>
          <div className="flex rounded-[18px] border border-[#FF0A78] bg-black shadow-[0_0_18px_rgba(255,10,120,0.3)]">
            <input
              autoFocus
              className="h-14 min-w-0 flex-1 rounded-l-[18px] bg-transparent px-4 text-xl font-black text-white outline-none placeholder:text-white/22"
              onChange={(event) => setMasterPin(event.target.value)}
              placeholder="••••"
              ref={inputRef}
              type={showPin ? "text" : "password"}
              value={masterPin}
            />
            <button
              className="min-w-24 rounded-r-[18px] px-3 text-sm font-black text-[#00E7F0]"
              onClick={() => setShowPin((visible) => !visible)}
              type="button"
            >
              {showPin ? "Verberg" : "Toon"}
            </button>
          </div>
        </label>

        {error ? (
          <div className="mt-4 rounded-[18px] border border-[#FF0A78] bg-[#2A0015] p-3 text-sm font-black text-[#FFD5EA]">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            className="flex min-h-14 items-center justify-center rounded-[18px] border border-white/12 bg-white/8 px-4 font-black text-white"
            href="/master"
          >
            Terug
          </Link>
          <button
            className="min-h-14 rounded-[18px] bg-[linear-gradient(180deg,#FF3B9D,#DB005F)] px-4 font-black text-white shadow-[0_0_22px_rgba(255,10,120,0.45)] disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Controleren..." : "Doorgaan"}
          </button>
        </div>
      </form>
    </main>
  );
}

export function TikTokLiveScreen({
  game,
  playerCount,
  gameState,
  currentQuestion,
  answerCount = 0,
}: {
  game: Doc<"games">;
  playerCount: number;
  gameState?: Doc<"gameState"> | null;
  currentQuestion?: Doc<"questions"> | null;
  answerCount?: number;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [remaining, setRemaining] = useState(() => secondsRemaining(game));
  const appUrl = publicAppUrl();
  const joinUrl = useMemo(() => `${appUrl}/join?code=${game.code}`, [appUrl, game.code]);
  const autoStartIfDue = useMutation(api.quiz.autoStartIfDue);
  const domain = displayDomain(appUrl);
  const [domainName, domainSuffix] = domain.includes(".")
    ? [domain.slice(0, domain.lastIndexOf(".")), domain.slice(domain.lastIndexOf("."))]
    : [domain, ".live"];
  const { minutes, seconds } = formatTime(remaining);
  const isUrgent = remaining <= 10 && game.countdownStatus === "running";
  const launchNumber = remaining <= 3 && game.countdownStatus === "running" ? remaining : null;
  const livePhase = gameState?.phase ?? game.livePhase ?? "lobby";
  const isQuestionVisible = livePhase === "question_live" && currentQuestion;
  const isAnswerVisible = livePhase === "showing_answer" && currentQuestion;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: "M",
      margin: 3,
      scale: 9,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then((nextQr) => {
        if (!cancelled) setQrDataUrl(nextQr);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextRemaining = secondsRemaining(game);
      setRemaining(nextRemaining);
      if (nextRemaining === 0 && game.autoStartEnabled && game.countdownStatus === "running") {
        void autoStartIfDue({ gameId: game._id });
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [autoStartIfDue, game]);

  return (
    <div className="relative aspect-[9/16] h-[min(100vh,calc(100vw*16/9))] w-[min(100vw,calc(100vh*9/16))] overflow-hidden bg-[#030306] text-white [container-type:inline-size]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_7%,rgba(255,10,120,0.22),transparent_24%),radial-gradient(circle_at_13%_48%,rgba(0,231,240,0.2),transparent_24%),radial-gradient(circle_at_88%_62%,rgba(168,85,247,0.2),transparent_24%),linear-gradient(180deg,#030306,#080014_54%,#030306)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36cqw] bg-[radial-gradient(ellipse_at_bottom,rgba(0,231,240,0.45),transparent_61%)]" />
      <div className="pointer-events-none absolute bottom-[-4cqw] left-1/2 h-[62cqw] w-[76cqw] -translate-x-1/2 bg-[repeating-conic-gradient(from_210deg,rgba(0,231,240,0.42)_0deg,transparent_2deg,transparent_8deg,rgba(255,10,120,0.36)_10deg,transparent_13deg)] opacity-45" />

      <aside className="absolute right-[4.5cqw] top-[13.5cqw] rounded-[2.2cqw] border-[0.24cqw] border-[#FF0A78] bg-[#080810]/88 px-[2cqw] py-[1.5cqw] text-center shadow-[0_0_2.5cqw_rgba(255,10,120,0.55)]">
        <div className="mx-auto flex h-[4.2cqw] w-[5.2cqw] items-center justify-center text-[#FF0A78]">
          <Icon className="h-[3.5cqw] w-[3.5cqw]" name="players" />
        </div>
        <p className="mt-[0.4cqw] text-[4cqw] font-black leading-none text-white">{playerCount}</p>
        <p className="mt-[0.6cqw] text-[1.4cqw] font-black uppercase leading-tight text-white/82">
          Spelers
          <br />
          online
        </p>
      </aside>

      <div className="relative z-10 flex h-full flex-col justify-between px-[6.2cqw] py-[4.2cqw]">
        <section className="text-center">
          <div className="mx-auto flex h-[8.5cqw] w-[8.5cqw] items-center justify-center rounded-full border-[0.45cqw] border-[#FF0A78] bg-[#030306] text-[5.7cqw] font-black text-white shadow-[0_0_3cqw_rgba(255,10,120,0.8)]">
            ?
          </div>
          <h1 className="mt-[1.3cqw] text-[10.5cqw] font-black uppercase leading-[0.9] tracking-normal text-white drop-shadow-[0_0.7cqw_0_rgba(0,0,0,0.9)]">
            Pubquiz
          </h1>
          <p className="-mt-[1cqw] rotate-[-5deg] text-[10.5cqw] font-black uppercase italic leading-none text-[#FF0A78] drop-shadow-[0_0_2.2cqw_rgba(255,10,120,0.75)]">
            Live
          </p>
          <p className="mt-[1.2cqw] text-[1.7cqw] font-black uppercase tracking-[0.28em] text-white/82">
            Speel mee - strijd - win
          </p>
        </section>

        {isQuestionVisible || isAnswerVisible ? (
          <section className="rounded-[4.5cqw] border-[0.28cqw] border-[#00E7F0] bg-[#080810]/90 px-[4cqw] py-[4cqw] shadow-[0_0_4.8cqw_rgba(0,231,240,0.34)]">
            <p className="text-center text-[1.8cqw] font-black uppercase tracking-[0.2em] text-[#FF0A78]">
              Vraag {game.currentQuestionNumber ?? 1} · {currentQuestion?.category ?? "Algemeen"}
            </p>
            <h2 className="mt-[3cqw] text-center text-[6.2cqw] font-black leading-tight text-white">
              {currentQuestion?.prompt}
            </h2>
            {currentQuestion?.type === "multiple_choice" ? (
              <div className="mt-[4cqw] grid gap-[1.5cqw]">
                {[
                  ["A", currentQuestion.optionA],
                  ["B", currentQuestion.optionB],
                  ["C", currentQuestion.optionC],
                  ["D", currentQuestion.optionD],
                ].map(([label, option]) => (
                  <div
                    className={`rounded-[2.2cqw] border-[0.18cqw] px-[2.5cqw] py-[1.6cqw] text-[2.8cqw] font-black ${
                      isAnswerVisible && currentQuestion.correctOption === label
                        ? "border-[#00E7F0] bg-[#00E7F0] text-black"
                        : "border-white/15 bg-black/58 text-white"
                    }`}
                    key={label}
                  >
                    <span className="text-[#FF0A78]">{label}</span> {option}
                  </div>
                ))}
              </div>
            ) : null}
            {isAnswerVisible ? (
              <div className="mt-[3cqw] rounded-[2.6cqw] bg-[#FF0A78] px-[3cqw] py-[2cqw] text-center text-[4.4cqw] font-black uppercase text-white">
                Juist: {currentQuestion?.correctOption ?? "Open"}
              </div>
            ) : (
              <p className="mt-[3cqw] text-center text-[2.1cqw] font-black uppercase text-white/72">
                {answerCount} antwoorden binnen
              </p>
            )}
          </section>
        ) : (
          <section className="rounded-[4.5cqw] border-[0.28cqw] border-[#FF0A78] bg-[#080810]/86 px-[4cqw] py-[3.4cqw] shadow-[0_0_4.8cqw_rgba(255,10,120,0.38)]">
            <div className="text-center">
              <p className="text-[4.4cqw] font-black uppercase leading-none text-white">Scan & doe mee!</p>
              <p className="mt-[0.8cqw] text-[2cqw] font-bold text-white/75">Scan de QR-code met je camera</p>
            </div>
            <div className="mx-auto mt-[3cqw] w-[43cqw] rounded-[3.2cqw] bg-[linear-gradient(135deg,#00E7F0,#FFFFFF_36%,#FF0A78)] p-[0.8cqw] shadow-[0_0_4cqw_rgba(0,231,240,0.58)]">
              <div className="rounded-[2.2cqw] bg-white p-[2.2cqw]">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="QR-code om mee te doen" className="h-[37cqw] w-[37cqw]" src={qrDataUrl} />
                ) : (
                  <div className="h-[37cqw] w-[37cqw] bg-white" />
                )}
              </div>
            </div>
            <p className="mt-[2.5cqw] text-center text-[1.6cqw] font-black uppercase text-white/75">Of ga naar</p>
            <p className="text-center text-[5cqw] font-black lowercase leading-none drop-shadow-[0_0_2cqw_rgba(0,231,240,0.7)]">
              <span className="text-[#00E7F0]">{domainName}</span>
              <span className="text-[#FF0A78]">{domainSuffix}</span>
            </p>
            <p className="mt-[2.3cqw] text-center text-[1.7cqw] font-black uppercase tracking-[0.18em] text-[#FF0A78]">
              Quiz code
            </p>
            <div className="mx-auto mt-[0.6cqw] rounded-[2.4cqw] border-[0.22cqw] border-[#FF0A78] bg-black px-[3cqw] py-[1.2cqw] shadow-[-1.5cqw_0_3cqw_rgba(0,231,240,0.25),1.5cqw_0_3cqw_rgba(255,10,120,0.35)]">
              <p className="text-center text-[5.4cqw] font-black uppercase tracking-[0.13em] text-white">{game.code}</p>
            </div>
          </section>
        )}

        <section
          className={`relative rounded-[3.2cqw] border-[0.28cqw] bg-[#080810]/92 px-[4cqw] py-[2.2cqw] text-center shadow-[0_0_4cqw_rgba(0,231,240,0.28)] ${
            isUrgent ? "border-[#FF0A78] shadow-[0_0_5cqw_rgba(255,10,120,0.55)]" : "border-[#00E7F0]"
          }`}
        >
          {launchNumber ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[3cqw] bg-black/50 text-[20cqw] font-black text-[#FF0A78] opacity-90">
              {launchNumber}
            </div>
          ) : null}
          <p className="text-[1.7cqw] font-black uppercase tracking-[0.18em] text-white/78">
            {game.countdownStatus === "paused"
              ? "Afteller gepauzeerd"
              : livePhase === "question_live"
                ? "Vraag is live"
                : game.status === "live"
                  ? "De quiz is gestart"
                : "De quiz start over"}
          </p>
          <div className={`mt-[0.7cqw] text-[9.4cqw] font-black leading-none text-white ${isUrgent ? "animate-pulse" : ""}`}>
            {minutes} : {seconds}
          </div>
          <div className="mx-auto mt-[1cqw] grid max-w-[42cqw] grid-cols-2 gap-[4cqw]">
            <p className="text-[1.7cqw] font-black uppercase tracking-[0.16em] text-[#00E7F0]">Minuten</p>
            <p className="text-[1.7cqw] font-black uppercase tracking-[0.16em] text-[#FF0A78]">Seconden</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function CountdownControls({
  game,
  gameId,
  hostSessionToken,
}: {
  game: Doc<"games">;
  gameId: Id<"games">;
  hostSessionToken: string;
}) {
  const [minutes, setMinutes] = useState(2);
  const [seconds, setSeconds] = useState(15);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [error, setError] = useState("");
  const setCountdown = useMutation(api.quiz.setCountdown);
  const startCountdown = useMutation(api.quiz.startCountdown);
  const pauseCountdown = useMutation(api.quiz.pauseCountdown);
  const resetCountdown = useMutation(api.quiz.resetCountdown);
  const startQuizNow = useMutation(api.quiz.startQuizNow);
  const durationSeconds = Math.max(0, minutes * 60 + seconds);
  const [isStarting, setIsStarting] = useState(false);
  const [success, setSuccess] = useState("");

  async function run(action: () => Promise<unknown>, successMessage = "") {
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(successMessage);
    } catch (unknownError) {
      console.error(unknownError);
      setError(unknownError instanceof Error ? unknownError.message : "Actie is niet gelukt.");
    }
  }

  async function handleStartQuizNow() {
    setIsStarting(true);
    await run(() => startQuizNow({ gameId, hostSessionToken }), "Quiz is gestart");
    setIsStarting(false);
  }

  return (
    <section className="rounded-[24px] border border-white/15 bg-black/70 p-5 text-white shadow-[0_0_34px_rgba(0,231,240,0.12)]">
      <label className="flex min-h-12 items-center gap-3 rounded-[18px] bg-white/8 px-4 text-sm font-black uppercase text-white/78">
        <input
          checked={autoStartEnabled}
          className="h-5 w-5 accent-[#FF0A78]"
          onChange={(event) => setAutoStartEnabled(event.target.checked)}
          type="checkbox"
        />
        Quiz automatisch starten bij 00:00
      </label>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {[
          ["30s", 30],
          ["1m", 60],
          ["2m", 120],
          ["3m", 180],
          ["5m", 300],
        ].map(([label, value]) => (
          <button
            className="min-h-11 rounded-[14px] bg-white/10 text-sm font-black text-white"
            key={label}
            onClick={() => {
              setMinutes(Math.floor((value as number) / 60));
              setSeconds((value as number) % 60);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <input
          className="h-12 rounded-[16px] border border-[#00E7F0] bg-black px-4 text-center text-xl font-black outline-none"
          min={0}
          onChange={(event) => setMinutes(Number(event.target.value))}
          type="number"
          value={minutes}
        />
        <input
          className="h-12 rounded-[16px] border border-[#FF0A78] bg-black px-4 text-center text-xl font-black outline-none"
          max={59}
          min={0}
          onChange={(event) => setSeconds(Math.min(59, Number(event.target.value)))}
          type="number"
          value={seconds}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          className="min-h-12 rounded-[16px] bg-[#00E7F0] text-sm font-black uppercase text-black"
          onClick={() => run(() => setCountdown({ gameId, hostSessionToken, durationSeconds, autoStartEnabled }), "Afteller ingesteld")}
          type="button"
        >
          Stel in
        </button>
        <button
          className="min-h-12 rounded-[16px] bg-[#FF0A78] text-sm font-black uppercase text-white"
          onClick={() => run(() => startCountdown({ gameId, hostSessionToken }), "Afteller gestart")}
          type="button"
        >
          Start afteller
        </button>
        <button
          className="min-h-12 rounded-[16px] bg-white/12 text-sm font-black uppercase text-white"
          onClick={() => run(() => pauseCountdown({ gameId, hostSessionToken }), "Afteller gepauzeerd")}
          type="button"
        >
          Pauzeer
        </button>
        <button
          className="min-h-12 rounded-[16px] bg-white/12 text-sm font-black uppercase text-white"
          onClick={() => run(() => resetCountdown({ gameId, hostSessionToken }), "Afteller gereset")}
          type="button"
        >
          Reset
        </button>
      </div>

      <button
        className="mt-4 min-h-14 w-full rounded-[18px] bg-[linear-gradient(180deg,#FF3B9D,#DB005F)] text-base font-black uppercase text-white disabled:opacity-60"
        disabled={isStarting || game.status === "live"}
        onClick={handleStartQuizNow}
        type="button"
      >
        {game.status === "live" ? "Quiz is live" : isStarting ? "Quiz starten..." : "▶ Start quiz nu"}
      </button>
      {success ? <p className="mt-3 text-center text-sm font-black text-[#00E7F0]">{success}</p> : null}
      {error ? <p className="mt-3 text-center text-sm font-black text-[#FFB4D1]">{error}</p> : null}
    </section>
  );
}

export function QuestionControlPanel({
  game,
  currentQuestion,
  answerCount,
  playerCount,
  hostSessionToken,
}: {
  game: Doc<"games">;
  currentQuestion?: Doc<"questions"> | null;
  answerCount: number;
  playerCount: number;
  hostSessionToken: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("A");
  const [points, setPoints] = useState(10);
  const [seconds, setSeconds] = useState(20);
  const [category, setCategory] = useState("Algemeen");
  const [speedBonus, setSpeedBonus] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const hostCreateQuestion = useMutation(api.quiz.hostCreateQuestion);
  const hostStartQuestion = useMutation(api.quiz.hostStartQuestion);
  const hostCloseQuestion = useMutation(api.quiz.hostCloseQuestion);
  const hostRevealAnswer = useMutation(api.quiz.hostRevealAnswer);
  const hostNextQuestion = useMutation(api.quiz.hostNextQuestion);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(successMessage);
    } catch (unknownError) {
      console.error(unknownError);
      setError(unknownError instanceof Error ? unknownError.message : "Actie is niet gelukt.");
    }
  }

  async function createQuestion(status: "draft" | "ready" | "publish") {
    await run(
      () =>
        hostCreateQuestion({
          gameId: game._id,
          hostSessionToken,
          prompt,
          type: "multiple_choice",
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption,
          category,
          points,
          answerDurationSeconds: seconds,
          speedBonus,
          status,
        }),
      status === "publish" ? "Vraag is live" : status === "ready" ? "Vraag staat klaar" : "Concept opgeslagen",
    );
    if (status !== "draft") {
      setPrompt("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
    }
  }

  return (
    <section className="rounded-[24px] border border-white/15 bg-black/70 p-5 text-white">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00E7F0]">Vragenbediening</p>
      <div className="mt-3 rounded-[18px] bg-white/8 p-4">
        <p className="text-sm font-black text-white">Status: {game.livePhase ?? game.status}</p>
        <p className="mt-1 text-sm font-bold text-white/55">
          Antwoorden: {answerCount}/{playerCount}
        </p>
        {currentQuestion ? (
          <p className="mt-2 text-lg font-black text-white">{currentQuestion.prompt}</p>
        ) : (
          <p className="mt-2 text-sm font-bold text-white/55">Geen vraag actief.</p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-sm font-black uppercase text-[#FF0A78]">+ Snelle vraag</p>
        <textarea
          className="min-h-24 w-full rounded-[18px] border border-white/12 bg-black px-4 py-3 font-bold text-white outline-none focus:border-[#00E7F0]"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Vraagtekst..."
          value={prompt}
        />
        <input
          className="h-11 w-full rounded-[16px] border border-white/12 bg-black px-3 font-bold text-white outline-none focus:border-[#00E7F0]"
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Categorie"
          value={category}
        />
        {[
          ["A", optionA, setOptionA],
          ["B", optionB, setOptionB],
          ["C", optionC, setOptionC],
          ["D", optionD, setOptionD],
        ].map(([label, value, setter]) => (
          <input
            className="h-11 w-full rounded-[16px] border border-white/12 bg-black px-3 font-bold text-white outline-none focus:border-[#00E7F0]"
            key={label as string}
            onChange={(event) => (setter as (nextValue: string) => void)(event.target.value)}
            placeholder={`Antwoord ${label}`}
            value={value as string}
          />
        ))}
        <div className="grid grid-cols-3 gap-2">
          <select
            className="h-11 rounded-[16px] border border-[#FF0A78] bg-black px-2 font-black text-white"
            onChange={(event) => setCorrectOption(event.target.value)}
            value={correctOption}
          >
            <option value="A">A goed</option>
            <option value="B">B goed</option>
            <option value="C">C goed</option>
            <option value="D">D goed</option>
          </select>
          <input
            className="h-11 rounded-[16px] border border-white/12 bg-black px-2 text-center font-black text-white"
            min={0}
            onChange={(event) => setPoints(Number(event.target.value))}
            type="number"
            value={points}
          />
          <input
            className="h-11 rounded-[16px] border border-white/12 bg-black px-2 text-center font-black text-white"
            min={5}
            onChange={(event) => setSeconds(Number(event.target.value))}
            type="number"
            value={seconds}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 rounded-[16px] bg-white/8 px-3 text-sm font-black text-white/78">
          <input
            checked={speedBonus}
            className="h-5 w-5 accent-[#00E7F0]"
            onChange={(event) => setSpeedBonus(event.target.checked)}
            type="checkbox"
          />
          Snelheidsbonus voor snelste goede antwoorden
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button className="min-h-11 rounded-[16px] bg-white/10 text-xs font-black uppercase" onClick={() => createQuestion("draft")} type="button">
            Concept
          </button>
          <button className="min-h-11 rounded-[16px] bg-[#00E7F0] text-xs font-black uppercase text-black" onClick={() => createQuestion("ready")} type="button">
            Klaarzetten
          </button>
          <button className="min-h-11 rounded-[16px] bg-[#FF0A78] text-xs font-black uppercase text-white" onClick={() => createQuestion("publish")} type="button">
            Publiceer
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="min-h-12 rounded-[16px] bg-[#00E7F0] text-sm font-black uppercase text-black disabled:opacity-50"
          disabled={!currentQuestion}
          onClick={() =>
            currentQuestion &&
            run(
              () => hostStartQuestion({ gameId: game._id, hostSessionToken, questionId: currentQuestion._id }),
              "Vraag gestart",
            )
          }
          type="button"
        >
          Start vraag
        </button>
        <button
          className="min-h-12 rounded-[16px] bg-white/12 text-sm font-black uppercase text-white"
          onClick={() => run(() => hostCloseQuestion({ gameId: game._id, hostSessionToken }), "Antwoorden gesloten")}
          type="button"
        >
          Sluit
        </button>
        <button
          className="min-h-12 rounded-[16px] bg-[#FF0A78] text-sm font-black uppercase text-white"
          onClick={() => run(() => hostRevealAnswer({ gameId: game._id, hostSessionToken }), "Antwoord getoond")}
          type="button"
        >
          Toon antwoord
        </button>
        <button
          className="min-h-12 rounded-[16px] bg-white/12 text-sm font-black uppercase text-white"
          onClick={() => run(() => hostNextQuestion({ gameId: game._id, hostSessionToken }), "Klaar voor volgende vraag")}
          type="button"
        >
          Volgende
        </button>
      </div>
      {success ? <p className="mt-3 text-center text-sm font-black text-[#00E7F0]">{success}</p> : null}
      {error ? <p className="mt-3 text-center text-sm font-black text-[#FFB4D1]">{error}</p> : null}
    </section>
  );
}

export function HostControlPanel({
  game,
  players,
  hostSessionToken,
  currentQuestion,
  answerCount,
}: {
  game: Doc<"games">;
  players: Array<Doc<"players">>;
  hostSessionToken: string;
  currentQuestion?: Doc<"questions"> | null;
  answerCount: number;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#FF0A78] bg-[#080810]/88 p-5 text-white shadow-[0_0_34px_rgba(255,10,120,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00E7F0]">Host bediening</p>
        <h1 className="mt-2 text-3xl font-black">TikTok LIVE</h1>
        <p className="mt-2 text-sm font-bold text-white/62">Code: {game.code}</p>
      </section>
      <CountdownControls game={game} gameId={game._id} hostSessionToken={hostSessionToken} />
      {game.status === "live" ? (
        <QuestionControlPanel
          answerCount={answerCount}
          currentQuestion={currentQuestion}
          game={game}
          hostSessionToken={hostSessionToken}
          playerCount={players.length}
        />
      ) : null}
      <section className="rounded-[24px] border border-white/12 bg-black/60 p-5 text-white">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF0A78]">Spelers</p>
        <p className="mt-2 text-5xl font-black">{players.length}</p>
        <p className="mt-1 text-sm font-bold text-white/55">aangesloten spelers</p>
      </section>
    </div>
  );
}
