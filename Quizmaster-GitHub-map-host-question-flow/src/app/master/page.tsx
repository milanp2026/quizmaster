"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Icon, InfoCard, PageHeader, PageShell, PinInput, StatusBadge } from "@/components/quiz-ui";

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
    <PageShell>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Quizmaster"
          right={<StatusBadge tone="yellow">Help</StatusBadge>}
          subtitle="Stel een pincode in zodat alleen jij als quizmaster deze game kunt beheren."
          title="Maak een nieuwe game"
        />

        <form className="space-y-5" onSubmit={handleSubmit}>
          <InfoCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6D3DF5]">
                    Pincode
                  </p>
                  <p className="mt-1 text-lg font-black text-[#10233F]">4 cijfers</p>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0EEFF] text-[#6D3DF5]">
                  <Icon name="lock" />
                </span>
              </div>

              <PinInput onChange={setMasterPin} value={masterPin} />

              <p className="text-sm font-bold text-[#667085]">Alleen voor jouw telefoon</p>
            </div>
          </InfoCard>

          {error ? (
            <div className="rounded-[22px] bg-[#FFF1F0] p-4 text-sm font-bold text-[#B42318] ring-1 ring-[#FEE4E2]">
              {error}
            </div>
          ) : null}

          <button
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-[24px] bg-[#FFC928] px-6 text-lg font-black text-[#071426] shadow-[0_18px_38px_rgba(255,201,40,0.35)] transition hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Game aanmaken..." : "Game aanmaken"}
            <Icon name="arrow" />
          </button>
        </form>
      </div>
    </PageShell>
  );
}
