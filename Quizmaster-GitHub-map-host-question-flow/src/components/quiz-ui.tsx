"use client";

import Link from "next/link";
import { ChangeEvent, ReactNode, useRef } from "react";

type IconName = "players" | "crown" | "bolt" | "arrow" | "check" | "group" | "clock" | "lock" | "star" | "share" | "home" | "settings";

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (name === "players") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (name === "crown") {
    return (
      <svg {...common}>
        <path d="m3 8 4 4 5-8 5 8 4-4-2 11H5L3 8Z" />
        <path d="M5 19h14" />
      </svg>
    );
  }

  if (name === "bolt") {
    return (
      <svg {...common}>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 5 7 7-7 7" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "group") {
    return (
      <svg {...common}>
        <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M2 21a6 6 0 0 1 12 0" />
        <path d="M17 11a3 3 0 1 0 0-6" />
        <path d="M22 21a5 5 0 0 0-5-5" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="4" y="10" width="16" height="10" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  if (name === "star") {
    return (
      <svg {...common}>
        <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6-4.3-4.2 6-.9L12 3Z" />
      </svg>
    );
  }

  if (name === "share") {
    return (
      <svg {...common}>
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 16V3" />
        <path d="m7 8 5-5 5 5" />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export function QuizLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative mx-auto ${compact ? "h-16 w-16" : "h-28 w-28"}`}>
      <div className="absolute inset-0 rounded-[32px] bg-[linear-gradient(135deg,#6D3DF5,#2D77F6_58%,#20C6C7)] shadow-[0_24px_60px_rgba(45,119,246,0.35)]" />
      <div className="absolute inset-[7px] rounded-[26px] bg-white/14 ring-1 ring-white/35" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${compact ? "text-4xl" : "text-7xl"} font-black leading-none text-white`}>Q</span>
      </div>
      <div className="absolute right-4 top-5 rotate-12 rounded-full bg-[#FFC928] p-1.5 text-[#071426] shadow-lg">
        <Icon className={compact ? "h-4 w-4" : "h-6 w-6"} name="bolt" />
      </div>
    </div>
  );
}

export function PageShell({
  children,
  dark = false,
  withBottomSpace = false,
}: {
  children: ReactNode;
  dark?: boolean;
  withBottomSpace?: boolean;
}) {
  return (
    <main
      className={`min-h-screen overflow-hidden px-5 py-6 font-sans ${
        withBottomSpace ? "pb-28" : "pb-8"
      } ${
        dark
          ? "bg-[#071426] text-white"
          : "bg-[radial-gradient(circle_at_top_left,rgba(140,77,255,0.14),transparent_34%),linear-gradient(180deg,#FFFFFF,#F5F7FB)] text-[#101828]"
      }`}
    >
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  backHref = "/",
  right,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: ReactNode;
  dark?: boolean;
}) {
  return (
    <header className="space-y-5">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <Link
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-sm transition active:scale-[0.98] ${
            dark ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-white text-[#10233F] ring-1 ring-[#E5EAF2]"
          }`}
          href={backHref}
        >
          <span aria-hidden="true">←</span>
          Terug
        </Link>
        {right}
      </div>
      <div className="space-y-2">
        {eyebrow ? (
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${dark ? "text-[#20C6C7]" : "text-[#6D3DF5]"}`}>
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-4xl font-black leading-[1.02] tracking-normal">{title}</h1>
        {subtitle ? <p className={`text-base font-medium leading-7 ${dark ? "text-white/70" : "text-[#667085]"}`}>{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function ActionCard({
  href,
  icon,
  title,
  subtitle,
  gradient,
}: {
  href: string;
  icon: IconName;
  title: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <Link
      className={`group flex min-h-28 items-center gap-4 rounded-[28px] px-5 py-5 text-white shadow-[0_22px_45px_rgba(16,35,63,0.18)] transition hover:-translate-y-0.5 active:scale-[0.99] ${gradient}`}
      href={href}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25">
        <Icon className="h-7 w-7" name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-2xl font-black">{title}</span>
        <span className="mt-1 block text-sm font-semibold text-white/78">{subtitle}</span>
      </span>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18 transition group-hover:translate-x-1">
        <Icon className="h-5 w-5" name="arrow" />
      </span>
    </Link>
  );
}

export function InfoCard({ children, dark = false, className = "" }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-[24px] p-5 shadow-[0_18px_40px_rgba(16,35,63,0.08)] ${
        dark ? "bg-[#10233F] ring-1 ring-white/10" : "bg-white ring-1 ring-[#EAECF0]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "yellow" | "dark" }) {
  const styles = {
    blue: "bg-[#EAF6FF] text-[#2D77F6]",
    yellow: "bg-[#FFF4C7] text-[#8A5A00]",
    dark: "bg-white/10 text-white ring-1 ring-white/15",
  };

  return (
    <span className={`inline-flex min-h-9 items-center rounded-full px-3 text-xs font-black uppercase tracking-[0.12em] ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function PinInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(4, " ").slice(0, 4).split("");

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    const nextDigits = value.padEnd(4, " ").slice(0, 4).split("");
    nextDigits[index] = digit || " ";
    onChange(nextDigits.join("").replace(/\s/g, ""));

    if (digit && index < 3) {
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      {digits.map((digit, index) => (
        <input
          aria-label={`Pincode cijfer ${index + 1}`}
          className="h-16 rounded-[20px] border-2 border-[#E5EAF2] bg-white text-center text-3xl font-black text-[#101828] shadow-sm outline-none transition focus:border-[#8C4DFF] focus:ring-4 focus:ring-[#8C4DFF]/15"
          inputMode="numeric"
          key={index}
          maxLength={1}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index].trim() && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          ref={(element) => {
            refs.current[index] = element;
          }}
          type="password"
          value={digit.trim()}
        />
      ))}
    </div>
  );
}

export function GameCodeCard({ code, helper, dark = false }: { code: string; helper?: string; dark?: boolean }) {
  return (
    <InfoCard dark={dark} className={dark ? "bg-[#10233F]" : "bg-[#10233F] text-white"}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#20C6C7]">Gamecode</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#FFC928]">
          <Icon name="share" />
        </span>
      </div>
      <p className="mt-3 text-center text-5xl font-black tracking-[0.16em] text-[#FFC928]">{code}</p>
      {helper ? <p className="mt-3 text-center text-sm font-semibold text-white/70">{helper}</p> : null}
    </InfoCard>
  );
}

export function PlayerCard({
  name,
  score,
  rank,
  dark = false,
  actions,
}: {
  name: string;
  score?: number;
  rank?: number;
  dark?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className={`rounded-[22px] p-4 shadow-sm ${dark ? "bg-[#10233F] ring-1 ring-white/10" : "bg-white ring-1 ring-[#EAECF0]"}`}>
      <div className="flex min-h-12 items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black ${dark ? "bg-white/10 text-[#20C6C7]" : "bg-[#F0EEFF] text-[#6D3DF5]"}`}>
          {rank ?? <Icon name="players" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-black uppercase tracking-[0.14em] ${dark ? "text-white/45" : "text-[#667085]"}`}>Speler</p>
          <p className="truncate text-lg font-black">{name}</p>
        </div>
        {score !== undefined ? <p className="text-lg font-black text-[#FFC928]">{score}</p> : null}
      </div>
      {actions ? <div className="mt-3">{actions}</div> : null}
    </div>
  );
}

export function BottomNavigation({ active = "Dashboard" }: { active?: "Dashboard" | "Spelers" | "Instellingen" }) {
  const items: Array<{ label: "Dashboard" | "Spelers" | "Instellingen"; icon: IconName }> = [
    { label: "Dashboard", icon: "home" },
    { label: "Spelers", icon: "players" },
    { label: "Instellingen", icon: "settings" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-5 pb-4">
      <div className="grid grid-cols-3 gap-2 rounded-[26px] bg-[#071426]/92 p-2 text-white shadow-[0_20px_60px_rgba(7,20,38,0.38)] ring-1 ring-white/10 backdrop-blur">
        {items.map((item) => {
          const isActive = item.label === active;
          return (
            <a
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[20px] text-[11px] font-black transition ${
                isActive ? "bg-[#FFC928] text-[#071426]" : "text-white/62"
              }`}
              href="#"
              key={item.label}
            >
              <Icon className="h-5 w-5" name={item.icon} />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

