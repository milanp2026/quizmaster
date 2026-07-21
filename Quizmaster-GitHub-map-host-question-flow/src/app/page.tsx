import { ActionCard, Icon, InfoCard, QuizLogo } from "@/components/quiz-ui";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(140,77,255,0.16),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(32,198,199,0.18),transparent_28%),linear-gradient(180deg,#FFFFFF,#F5F7FB)] px-5 py-8 text-[#101828]">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col">
        <section className="pt-4 text-center">
          <QuizLogo />
          <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-[#6D3DF5]">
            Live quizgame
          </p>
          <h1 className="mt-3 text-5xl font-black leading-[0.98] tracking-normal">
            QuizMaster Live
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-lg font-semibold leading-7 text-[#667085]">
            Live quizzen. Samen winnen.
          </p>
        </section>

        <section className="mt-10 grid gap-4">
          <ActionCard
            gradient="bg-[linear-gradient(135deg,#6D3DF5,#8C4DFF)]"
            href="/join"
            icon="players"
            subtitle="Doe mee met een game"
            title="Meedoen"
          />
          <ActionCard
            gradient="bg-[linear-gradient(135deg,#2D77F6,#20C6C7)]"
            href="/master"
            icon="crown"
            subtitle="Maak en beheer je quiz"
            title="Quizmaster"
          />
        </section>

        <InfoCard className="mt-6">
          <div className="grid gap-4">
            {[
              ["Live & interactief", "bolt"],
              ["Voor alle groepen", "group"],
              ["Snel & makkelijk", "clock"],
            ].map(([label, icon]) => (
              <div className="flex min-h-12 items-center gap-3" key={label}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F0EEFF] text-[#6D3DF5]">
                  <Icon name={icon as "bolt" | "group" | "clock"} />
                </span>
                <p className="text-base font-black text-[#10233F]">{label}</p>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(ellipse_at_bottom,#20C6C7_0%,rgba(45,119,246,0.28)_42%,transparent_72%)] opacity-70" />
    </main>
  );
}
