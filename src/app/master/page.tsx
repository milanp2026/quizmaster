"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function CreateGamePage() {
  const router = useRouter();
  const createGame = useMutation(api.quiz.createGame);
  const [masterPin, setMasterPin] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsCreating(true);

    try {
      const result = await createGame({ masterPin });
      router.push(`/master/${result.gameId}`);
    } catch (unknownError) {
      setError(
        unknownError instanceof Error ? unknownError.message : "Game aanmaken is niet gelukt.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-[#1f2933]">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-sm flex-col justify-between gap-8">
        <div className="space-y-6">
          <Link className="text-sm font-semibold text-[#256f62]" href="/">
            Terug naar home
          </Link>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d6d]">
              Quizmaster
            </p>
            <h1 className="text-4xl font-bold leading-tight">Maak een nieuwe game.</h1>
            <p className="text-lg text-[#52606d]">
              Kies een pincode voor deze quizmaster-telefoon.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#52606d]">Quizmaster-pincode</span>
            <input
              className="h-16 w-full rounded-lg border-2 border-transparent bg-white px-5 text-center text-3xl font-bold tracking-[0.2em] shadow-sm outline-none transition focus:border-[#256f62]"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setMasterPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              type="password"
              value={masterPin}
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-[#fff1f0] p-4 text-sm font-semibold text-[#b42318]">
              {error}
            </p>
          ) : null}

          <button
            className="min-h-16 w-full rounded-lg bg-[#256f62] px-6 py-5 text-xl font-semibold text-white shadow-sm transition-colors hover:bg-[#1f5f54] focus:outline-none focus:ring-4 focus:ring-[#256f62]/25 disabled:cursor-not-allowed disabled:bg-[#9fb8b2]"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Game maken..." : "Nieuwe game aanmaken"}
          </button>
        </form>
      </section>
    </main>
  );
}
