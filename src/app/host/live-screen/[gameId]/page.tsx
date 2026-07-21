"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { TikTokLiveScreen } from "@/components/tiktok-live-screen";

export default function HostLiveScreenPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId as Id<"games">;
  const game = useQuery(api.quiz.getGame, { gameId });
  const players = useQuery(api.quiz.listPlayers, { gameId });

  if (game === undefined || players === undefined) {
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

  return <TikTokLiveScreen game={game} mode="control" playerCount={players.length} />;
}
