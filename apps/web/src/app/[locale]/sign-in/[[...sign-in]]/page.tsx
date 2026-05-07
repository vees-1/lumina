"use client";

import { useState } from "react";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { useLocale } from "next-intl";
import { LuminaLogo } from "@/components/lumina/practo-ui";

function AuthArt() {
  return (
    <div className="relative h-[360px]">
      <div className="absolute left-[80px] top-[70px] h-[225px] w-[225px] rounded-full bg-[#38bce8]" />
      <div className="absolute left-[118px] top-[94px] h-[148px] w-[148px] rounded-full border border-white/35" />
      <div className="absolute left-[38px] top-[165px] h-[42px] w-[315px] rotate-[-12deg] rounded-full border-[18px] border-[#7654f4]" />
      <div className="absolute left-[44px] top-[185px] h-[6px] w-[220px] rotate-[-12deg] rounded-full bg-white" />
      <div className="absolute left-[96px] top-[40px] h-[104px] w-[74px] rotate-[-38deg] rounded-[9px] bg-[#3140d4] shadow-[0_8px_18px_rgba(40,50,140,.22)]" />
      <div className="absolute left-[184px] top-[24px] h-[104px] w-[74px] rotate-[-8deg] rounded-[9px] bg-[#2866da] shadow-[0_8px_18px_rgba(40,50,140,.22)]" />
      <div className="absolute left-[260px] top-[64px] h-[104px] w-[74px] rotate-[18deg] rounded-[9px] bg-[#22b5e7] shadow-[0_8px_18px_rgba(40,50,140,.22)]" />
      <div className="absolute left-[326px] top-[142px] h-[18px] w-[46px] rotate-[-40deg] rounded-[14px] bg-[linear-gradient(90deg,#ff8a00_50%,#fff_51%)]" />
      <div className="absolute left-[346px] top-[72px] h-3 w-3 rounded-full bg-[#7654f4]" />
      <div className="absolute left-[62px] top-[94px] h-2 w-2 rounded-full bg-[#22b5e7]" />
      <div className="absolute left-[294px] top-[278px] h-4 w-4 rounded-full bg-[#3140d4]" />
    </div>
  );
}

function RoleGate({ onSelect }: { onSelect: (role: "doctor" | "patient") => void }) {
  return (
    <div className="w-full">
      <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#8a91a2]">Before login</p>
      <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#2f3037]">Are you a doctor?</h1>
      <p className="mt-3 text-[15px] leading-7 text-[#62687a]">
        This lets Lumina send you to the correct workspace after authentication.
      </p>
      <div className="mt-7 grid gap-3">
        <button
          type="button"
          onClick={() => onSelect("doctor")}
          className="rounded border border-[#d8deea] bg-white px-5 py-4 text-left transition-colors hover:border-[#38b6e8] hover:bg-[#f7fbfe]"
        >
          <span className="block text-[18px] font-bold text-[#2536a0]">Yes, I am a doctor</span>
          <span className="mt-1 block text-[14px] text-[#62687a]">Open doctor dashboard, cases, HPO approval, scoring, and letters.</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("patient")}
          className="rounded border border-[#d8deea] bg-white px-5 py-4 text-left transition-colors hover:border-[#38b6e8] hover:bg-[#f7fbfe]"
        >
          <span className="block text-[18px] font-bold text-[#2536a0]">No, I am a patient</span>
          <span className="mt-1 block text-[14px] text-[#62687a]">Open patient dashboard for evidence submission and approved scorecards.</span>
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const locale = useLocale();
  const [role, setRole] = useState<"doctor" | "patient" | null>(null);

  function chooseRole(nextRole: "doctor" | "patient") {
    window.localStorage.setItem("lumina_user_role", nextRole);
    setRole(nextRole);
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#eeeef3]">
        <nav className="mx-auto flex h-[74px] max-w-6xl items-center justify-between px-6">
          <Link href={`/${locale}`}>
            <LuminaLogo />
          </Link>
          <Link href={`/${locale}/sign-up`} className="rounded border border-[#d3d3dc] px-4 py-2 text-[14px] text-[#62626e]">
            Login / Signup
          </Link>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[892px] justify-center gap-[72px] border-b border-[#e6e6eb]">
        <button className="h-[55px] border-b-2 border-[#14bef0] bg-white px-3 text-[14px] font-bold text-[#14bef0]">Login</button>
        <Link href={`/${locale}/sign-up`} className="flex h-[55px] items-center px-3 text-[14px] text-[#414146]">Register</Link>
      </div>

      <main className="mx-auto grid w-[900px] max-w-[calc(100%-32px)] grid-cols-1 items-center gap-[72px] py-[84px] lg:grid-cols-[1fr_400px]">
        <AuthArt />
        <div>
          {!role ? (
            <RoleGate onSelect={chooseRole} />
          ) : (
            <SignIn
              forceRedirectUrl={`/${locale}/${role === "patient" ? "patient" : "dashboard"}`}
              signUpUrl={`/${locale}/sign-up`}
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "shadow-none border-0 w-full",
                  card: "shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "hidden",
                  dividerRow: "hidden",
                  formFieldLabel: "text-[14px] text-[#6f7080]",
                  formFieldInput: "h-[35px] rounded-none border-[#c6c6d0] text-[14px]",
                  formButtonPrimary: "h-[45px] rounded bg-[#42b8e8] text-[14px] font-bold hover:bg-[#35addf]",
                  footer: "hidden",
                },
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
