"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Icon } from "@/components/quiz-ui";

type LiveMode = "display" | "control";

type LiveScreenProps = {
  game: Doc<"games">;
  playerCount: number;
  mode: LiveMode;
};

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
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, "0");
  return { minutes, seconds };
}

function publicAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

function displayDomain(url: string) {
  try {
    const host = new URL(url).host.replace(/^www\./, "");
    return host || "quizmaster.live";
  } catch {
    return "quizmaster.live";
  }
}

export function LiveLogo() {
  return (
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
  );
}

export function PlayerCountBadge({ count }: { count: number }) {
  return (
    <aside className="absolute right-[4.5cqw] top-[13.5cqw] rounded-[2.2cqw] border-[0.24cqw] border-[#FF0A78] bg-[#080810]/88 px-[2cqw] py-[1.5cqw] text-center shadow-[0_0_2.5cqw_rgba(255,10,120,0.55)]">
      <div className="mx-auto flex h-[4.2cqw] w-[5.2cqw] items-center justify-center text-[#FF0A78]">
        <Icon className="h-[3.5cqw] w-[3.5cqw]" name="players" />
      </div>
      <p className="mt-[0.4cqw] animate-[player-pop_0.35s_ease-out] text-[4cqw] font-black leading-none text-white">
        {count}
      </p>
      <p className="mt-[0.6cqw] text-[1.4cqw] font-black uppercase leading-tight text-white/82">
        Spelers
        <br />
        online
      </p>
    </aside>
  );
}

export function JoinQrCard({
  code,
  qrDataUrl,
  siteUrl,
}: {
  code: string;
  qrDataUrl: string;
  siteUrl: string;
}) {
  const domain = displayDomain(siteUrl);
  const [name, suffix] = domain.includes(".")
    ? [domain.slice(0, domain.lastIndexOf(".")), domain.slice(domain.lastIndexOf("."))]
    : [domain, ".live"];

  return (
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
        <span className="text-[#00E7F0]">{name}</span>
        <span className="text-[#FF0A78]">{suffix}</span>
      </p>

      <p className="mt-[2.3cqw] text-center text-[1.7cqw] font-black uppercase tracking-[0.18em] text-[#FF0A78]">
        Quiz code
      </p>
      <div className="mx-auto mt-[0.6cqw] rounded-[2.4cqw] border-[0.22cqw] border-[#FF0A78] bg-black px-[3cqw] py-[1.2cqw] shadow-[-1.5cqw_0_3cqw_rgba(0,231,240,0.25),1.5cqw_0_3cqw_rgba(255,10,120,0.35)]">
        <p className="text-center text-[5.4cqw] font-black uppercase tracking-[0.13em] text-white">
          {code}
        </p>
      </div>
    </section>
  );
}

export function LiveCountdown({ game, remaining }: { game: Doc<"games">; remaining: number }) {
  const { minutes, seconds } = formatTime(remaining);
  const isUrgent = remaining <= 10 && game.countdownStatus === "running";
  const launchNumber = remaining <= 3 && game.countdownStatus === "running" ? remaining : null;

  return (
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
          : game.status === "live"
            ? "De quiz is live"
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
  );
}

export function HostStartButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <button
      className="rounded-[3cqw] border-[0.28cqw] border-[#FF78B4] bg-[linear-gradient(180deg,#FF3B9D,#DB005F)] px-[5cqw] py-[2.2cqw] text-center text-[4.8cqw] font-black uppercase text-white shadow-[inset_0_0.2cqw_0_rgba(255,255,255,0.35),0_0_4.5cqw_rgba(255,10,120,0.72)] transition active:scale-[0.99]"
      onClick={onClick}
      type="button"
    >
      ▶ Start
      <span className="block text-[1.4cqw] tracking-[0.12em] text-white/70">Ik start de quiz</span>
    </button>
  );
}

export function CountdownControls({ gameId }: { gameId: Id<"games"> }) {
  const [masterPin, setMasterPin] = useState("");
  const [minutes, setMinutes] = useState(2);
  const [seconds, setSeconds] = useState(15);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [error, setError] = useState("");
  const setCountdown = useMutation(api.quiz.setCountdown);
  const startCountdown = useMutation(api.quiz.startCountdown);
  const pauseCountdown = useMutation(api.quiz.pauseCountdown);
  const resetCountdown = useMutation(api.quiz.resetCountdown);
  const startQuizNow = useMutation(api.quiz.startQuizNow);

  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Actie is niet gelukt.");
    }
  }

  const durationSeconds = Math.max(0, minutes * 60 + seconds);

  return (
    <section className="rounded-[2.6cqw] border border-white/15 bg-black/70 p-[2cqw] text-white">
      <div className="grid grid-cols-2 gap-[1.2cqw]">
        <input
          className="h-[5cqw] rounded-[1.4cqw] border border-[#FF0A78] bg-black px-[1.5cqw] text-[1.8cqw] font-black outline-none"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => setMasterPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Pincode"
          type="password"
          value={masterPin}
        />
        <label className="flex items-center gap-[1cqw] text-[1.5cqw] font-black uppercase text-white/78">
          <input
            checked={autoStartEnabled}
            className="h-[2.4cqw] w-[2.4cqw] accent-[#FF0A78]"
            onChange={(event) => setAutoStartEnabled(event.target.checked)}
            type="checkbox"
          />
          Auto start
        </label>
      </div>
      <div className="mt-[1.3cqw] grid grid-cols-5 gap-[0.8cqw]">
        {[
          ["30s", 30],
          ["1m", 60],
          ["2m", 120],
          ["3m", 180],
          ["5m", 300],
        ].map(([label, value]) => (
          <button
            className="min-h-[4.2cqw] rounded-[1.4cqw] bg-white/10 text-[1.5cqw] font-black text-white"
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
      <div className="mt-[1.3cqw] grid grid-cols-2 gap-[1cqw]">
        <input
          className="h-[5cqw] rounded-[1.4cqw] border border-[#00E7F0] bg-black px-[1.5cqw] text-center text-[2cqw] font-black outline-none"
          min={0}
          onChange={(event) => setMinutes(Number(event.target.value))}
          type="number"
          value={minutes}
        />
        <input
          className="h-[5cqw] rounded-[1.4cqw] border border-[#FF0A78] bg-black px-[1.5cqw] text-center text-[2cqw] font-black outline-none"
          max={59}
          min={0}
          onChange={(event) => setSeconds(Math.min(59, Number(event.target.value)))}
          type="number"
          value={seconds}
        />
      </div>
      <div className="mt-[1.3cqw] grid grid-cols-2 gap-[1cqw]">
        <button
          className="min-h-[4.7cqw] rounded-[1.6cqw] bg-[#00E7F0] text-[1.7cqw] font-black uppercase text-black"
          onClick={() =>
            run(() => setCountdown({ gameId, masterPin, durationSeconds, autoStartEnabled }))
          }
          type="button"
        >
          Stel in
        </button>
        <button
          className="min-h-[4.7cqw] rounded-[1.6cqw] bg-[#FF0A78] text-[1.7cqw] font-black uppercase text-white"
          onClick={() => run(() => startCountdown({ gameId, masterPin }))}
          type="button"
        >
          Start afteller
        </button>
        <button
          className="min-h-[4.7cqw] rounded-[1.6cqw] bg-white/12 text-[1.7cqw] font-black uppercase text-white"
          onClick={() => run(() => pauseCountdown({ gameId, masterPin }))}
          type="button"
        >
          Pauzeer
        </button>
        <button
          className="min-h-[4.7cqw] rounded-[1.6cqw] bg-white/12 text-[1.7cqw] font-black uppercase text-white"
          onClick={() => run(() => resetCountdown({ gameId, masterPin }))}
          type="button"
        >
          Reset
        </button>
      </div>
      <button
        className="mt-[1.3cqw] min-h-[4.8cqw] w-full rounded-[1.8cqw] bg-[linear-gradient(180deg,#FF3B9D,#DB005F)] text-[1.8cqw] font-black uppercase text-white"
        onClick={() => run(() => startQuizNow({ gameId, masterPin }))}
        type="button"
      >
        Start quiz nu
      </button>
      {error ? <p className="mt-[1cqw] text-center text-[1.5cqw] font-black text-[#FFB4D1]">{error}</p> : null}
    </section>
  );
}

export function TikTokLiveScreen({ game, playerCount, mode }: LiveScreenProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [remaining, setRemaining] = useState(() => secondsRemaining(game));
  const appUrl = publicAppUrl();
  const joinUrl = useMemo(() => `${appUrl}/join?code=${game.code}`, [appUrl, game.code]);
  const startQuizNow = useMutation(api.quiz.startQuizNow);
  const autoStartIfDue = useMutation(api.quiz.autoStartIfDue);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: "M",
      margin: 3,
      scale: 9,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
      .then((nextQr) => {
        if (!cancelled) {
          setQrDataUrl(nextQr);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl("");
        }
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

  async function handleHostStart(event?: FormEvent) {
    event?.preventDefault();
    const masterPin = window.prompt("Quizmaster pincode");
    if (!masterPin) {
      return;
    }
    await startQuizNow({ gameId: game._id, masterPin });
  }

  return (
    <main className="grid h-screen w-screen place-items-center overflow-hidden bg-black">
      <div className="relative aspect-[9/16] h-[min(100vh,calc(100vw*16/9))] w-[min(100vw,calc(100vh*9/16))] overflow-hidden bg-[#030306] text-white [container-type:inline-size]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_7%,rgba(255,10,120,0.22),transparent_24%),radial-gradient(circle_at_13%_48%,rgba(0,231,240,0.2),transparent_24%),radial-gradient(circle_at_88%_62%,rgba(168,85,247,0.2),transparent_24%),linear-gradient(180deg,#030306,#080014_54%,#030306)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36cqw] bg-[radial-gradient(ellipse_at_bottom,rgba(0,231,240,0.45),transparent_61%)]" />
        <div className="pointer-events-none absolute bottom-[-4cqw] left-1/2 h-[62cqw] w-[76cqw] -translate-x-1/2 bg-[repeating-conic-gradient(from_210deg,rgba(0,231,240,0.42)_0deg,transparent_2deg,transparent_8deg,rgba(255,10,120,0.36)_10deg,transparent_13deg)] opacity-45" />

        <PlayerCountBadge count={playerCount} />

        <div className="relative z-10 flex h-full flex-col justify-between px-[6.2cqw] py-[4.2cqw]">
          <LiveLogo />
          <JoinQrCard code={game.code} qrDataUrl={qrDataUrl} siteUrl={appUrl} />
          <LiveCountdown game={game} remaining={remaining} />
          {mode === "control" ? (
            <div className="grid gap-[1.5cqw]">
              <HostStartButton visible onClick={() => void handleHostStart()} />
              <CountdownControls gameId={game._id} />
            </div>
          ) : (
            <HostStartButton visible={false} onClick={() => undefined} />
          )}
        </div>

        <style jsx global>{`
          @keyframes player-pop {
            0% {
              transform: scale(0.82);
              color: #00e7f0;
            }
            100% {
              transform: scale(1);
              color: #ffffff;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}
