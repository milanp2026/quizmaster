"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { HostControlPanel, HostPinLogin, TikTokLiveScreen } from "@/components/tiktok-live-screen";

export default function HostLiveScreenPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId as Id<"games">;
  const storageKey = `quizmaster-host-session:${gameId}`;
  const [sessionToken, setSessionToken] = useState(() =>
    typeof window === "undefined" ? "" : window.sessionStorage.getItem(storageKey) ?? "",
  );
  const game = useQuery(api.quiz.getGame, { gameId });
  const players = useQuery(api.quiz.listPlayers, { gameId });
  const gameState = useQuery(api.quiz.getGameState, { gameId });
  const currentQuestion = useQuery(api.quiz.getCurrentQuestion, { gameId });
  const answers = useQuery(api.quiz.listAnswersForCurrentQuestion, { gameId });
  const session = useQuery(
    api.quiz.validateHostSession,
    sessionToken ? { gameId, token: sessionToken } : "skip",
  );

  if (game === undefined || players === undefined || gameState === undefined || currentQuestion === undefined || answers === undefined) {
    return (
      <main className="grid h-screen place-items-center bg-black text-xl font-black text-white">
        TikTok-scherm laden...
      </main>
    );
  }

  if (!game) {
    return (
      <main className="grid h-screen place-items-center bg-black px-6 text-center text-xl font-black text-white">
        Game niet gevonden.
      </main>
    );
  }

  if (!sessionToken || session?.valid === false) {
    if (session?.valid === false && sessionToken) {
      window.sessionStorage.removeItem(storageKey);
    }
    return <HostPinLogin gameId={gameId} onAuthenticated={setSessionToken} />;
  }

  if (session === undefined) {
    return (
      <main className="grid h-screen place-items-center bg-black text-xl font-black text-white">
        Hostsessie controleren...
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030306] p-4 text-white">
      <div className="mx-auto grid max-w-[1680px] gap-5 xl:grid-cols-[360px_minmax(360px,calc(100vh*9/16))_300px]">
        <aside className="xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:overflow-auto">
          <HostControlPanel
            answerCount={answers.length}
            currentQuestion={currentQuestion}
            game={game}
            hostSessionToken={sessionToken}
            players={players}
          />
        </aside>

        <section className="grid min-h-[70vh] place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-black/70 p-3">
          <TikTokLiveScreen
            answerCount={answers.length}
            currentQuestion={currentQuestion}
            game={game}
            gameState={gameState}
            playerCount={players.length}
          />
        </section>

        <aside className="space-y-4 rounded-[24px] border border-white/12 bg-black/55 p-5 xl:sticky xl:top-4 xl:h-fit">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00E7F0]">Routes</p>
          <div>
            <p className="text-sm font-black text-white">OBS / publiek</p>
            <p className="mt-1 break-all text-sm font-bold text-white/55">/live/{game.code}</p>
          </div>
          <div>
            <p className="text-sm font-black text-white">Bediening</p>
            <p className="mt-1 break-all text-sm font-bold text-white/55">/host/live-screen/{game._id}</p>
          </div>
          <div>
            <p className="text-sm font-black text-white">Sessie</p>
            <p className="mt-1 text-sm font-bold text-white/55">
              Je hosttoken staat tijdelijk in sessionStorage en verloopt automatisch.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
