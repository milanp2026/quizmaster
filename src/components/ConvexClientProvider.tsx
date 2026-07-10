"use client";

import { ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { ConvexProvider } from "convex/react";

type ConvexClientProviderProps = {
  children: ReactNode;
};

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convex = useMemo(() => {
    if (!convexUrl) {
      return null;
    }

    return new ConvexReactClient(convexUrl);
  }, [convexUrl]);

  if (!convex) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <div className="max-w-xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-300">
            Convex nog niet gekoppeld
          </p>
          <h1 className="text-3xl font-semibold">Voeg je bestaande Convex URL toe.</h1>
          <p className="text-base leading-7 text-zinc-300">
            Zet <code className="rounded bg-white/10 px-1.5 py-0.5">NEXT_PUBLIC_CONVEX_URL</code>{" "}
            in <code className="rounded bg-white/10 px-1.5 py-0.5">.env.local</code> en start
            de app opnieuw. Daarna gebruikt deze Next.js-app je bestaande Convex-project.
          </p>
        </div>
      </main>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
