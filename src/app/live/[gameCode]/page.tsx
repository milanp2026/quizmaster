"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TikTokLiveScreen } from "@/components/tiktok-live-screen";

export default function PublicLiveScreenPage() {
  const params = useParams<{ gameCode: string }>();
  const liveLobby = useQuery(api.quiz.getLiveLobby, { code: params.gameCode });

  if (liveLobby === undefined) {
    return (
      <main className="grid h-screen place-items-center bg-black text-xl font-black text-white">
        Live-scherm laden...
      </main>
    );
  }

  if (!liveLobby) {
    return (
      <main className="grid h-screen place-items-center bg-black px-6 text-center text-xl font-black text-white">
        Ongeldige of verlopen gamecode.
      </main>
    );
  }

  return (
    <main className="grid h-screen w-screen place-items-center overflow-hidden bg-black">
      <TikTokLiveScreen game={liveLobby.game} playerCount={liveLobby.playerCount} />
    </main>
  );
}
