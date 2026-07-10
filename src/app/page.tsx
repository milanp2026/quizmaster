import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] px-5 py-8 text-[#1f2933]">
      <section className="flex w-full max-w-sm flex-col items-stretch gap-8">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2f7d6d]">
            Live quiz
          </p>
          <h1 className="text-5xl font-bold leading-tight">QuizMaster Live</h1>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            className="flex min-h-16 items-center justify-center rounded-lg bg-[#256f62] px-6 py-5 text-xl font-semibold text-white shadow-sm transition-colors hover:bg-[#1f5f54] focus:outline-none focus:ring-4 focus:ring-[#256f62]/25"
            href="/join"
          >
            Meedoen
          </Link>
          <Link
            className="flex min-h-16 items-center justify-center rounded-lg border-2 border-[#256f62] bg-white px-6 py-5 text-xl font-semibold text-[#256f62] shadow-sm transition-colors hover:bg-[#eef7f4] focus:outline-none focus:ring-4 focus:ring-[#256f62]/20"
            href="/master"
          >
            Quizmaster
          </Link>
        </div>
      </section>
    </main>
  );
}
