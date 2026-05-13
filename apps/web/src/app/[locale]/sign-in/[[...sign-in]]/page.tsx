"use client";

import { useState } from "react";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { LuminaLogo } from "@/components/lumina/practo-ui";
import { Stethoscope, User } from "lucide-react";

function RoleGate({ onSelect }: { onSelect: (role: "doctor" | "patient") => void }) {
  const t = useTranslations("auth");
  return (
    <div className="w-full">
      <p className="text-[12px] font-[800] uppercase tracking-[0.16em] text-cyan-500">
        {t("beforeLogin")}
      </p>
      <h2 className="mt-2 text-[28px] font-[800] tracking-[-0.03em] text-slate-900 dark:text-white sm:text-[36px]">
        {t("areYouADoctor")}
      </h2>
      <p className="mt-3 text-[15px] leading-6 text-slate-500 dark:text-slate-400">
        {t("selectRoleDesc")}
      </p>

      <div className="mt-8 grid gap-4">
        <button
          type="button"
          onClick={() => onSelect("doctor")}
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-left transition-all hover:border-cyan-400 hover:shadow-[0_8px_30px_rgba(34,211,238,0.15)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-500 transition-colors group-hover:bg-cyan-500 group-hover:text-white dark:bg-cyan-950/30">
            <Stethoscope className="h-6 w-6" />
          </span>
          <div>
            <span className="block text-[17px] font-[700] text-slate-900 dark:text-white">{t("yesIAmADoctor")}</span>
            <span className="mt-1 block text-[13.5px] leading-5 text-slate-500 dark:text-slate-400">
              {t("doctorRoleDesc")}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("patient")}
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 text-left transition-all hover:border-cyan-400 hover:shadow-[0_8px_30px_rgba(34,211,238,0.15)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 transition-colors group-hover:bg-cyan-500 group-hover:text-white">
            <User className="h-6 w-6" />
          </span>
          <div>
            <span className="block text-[17px] font-[700] text-slate-900 dark:text-white">{t("noIAmAPatient")}</span>
            <span className="mt-1 block text-[13.5px] leading-5 text-slate-500 dark:text-slate-400">
              {t("patientRoleDesc")}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const [role, setRole] = useState<"doctor" | "patient" | null>(null);

  function chooseRole(nextRole: "doctor" | "patient") {
    window.localStorage.setItem("lumina_user_role", nextRole);
    setRole(nextRole);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* -- Nav ----------------------------------------------------------- */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <nav className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-6 sm:px-8">
          <Link href={`/${locale}`}>
            <LuminaLogo />
          </Link>
          <div className="flex items-center gap-4 text-[14px] text-muted-foreground">
            <span>{t("noAccount")}</span>
            <Link
              href={`/${locale}/sign-up`}
              className="font-[700] text-cyan-500 dark:text-cyan-400 transition-colors hover:text-cyan-600"
            >
              {t("signUp")}
            </Link>
            <div className="h-4 w-[1px] bg-border mx-2" />
          </div>
        </nav>
      </header>

      {/* -- Main split layout --------------------------------------------- */}
      <main className="mx-auto flex max-w-[1400px] flex-col lg:flex-row min-h-[calc(100vh-72px)]">

        <div className="flex w-full flex-col items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[440px]">
            {!role ? (
              <RoleGate onSelect={chooseRole} />
            ) : (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 flex items-center justify-between rounded-xl border border-cyan-100 dark:border-cyan-900/30 bg-cyan-50 dark:bg-cyan-950/20 px-4 py-3">
                  <p className="text-[14px] text-slate-600 dark:text-slate-300">
                    {t("signingInAs")}{" "}
                    <span className="font-[800] text-cyan-600 dark:text-cyan-400">
                      {role === "doctor" ? t("doctor") : t("patient")}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setRole(null)}
                    className="text-[13px] font-[700] text-cyan-600 dark:text-cyan-400 transition-colors hover:text-cyan-500"
                  >
                    {t("changeRole")}
                  </button>
                </div>

                <SignIn
                  path={`/${locale}/sign-in`}
                  routing="path"
                  forceRedirectUrl={`/${locale}/${role === "patient" ? "patient" : "dashboard"}`}
                  signUpUrl={`/${locale}/sign-up`}
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      cardBox: "shadow-none border-0 w-full bg-transparent",
                      card: "shadow-none border-0 p-0 bg-transparent",
                      headerTitle: "hidden",
                      headerSubtitle: "hidden",
                      formFieldLabel: "text-[14px] font-[600] text-slate-700 dark:text-slate-300",
                      formFieldInput:
                        "h-[48px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all",
                      formButtonPrimary:
                        "h-[48px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[15px] font-[700] shadow-lg shadow-cyan-500/25 transition-all text-white",
                      socialButtonsBlockButton:
                        "h-[48px] rounded-xl border-slate-200 dark:border-slate-800 text-[14px] font-[600] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors",
                      dividerText: "text-[13px] text-slate-400",
                      dividerLine: "bg-slate-200 dark:bg-slate-800",
                      footer: "hidden",
                      identityPreviewEditButton: "text-cyan-500",
                      alternativeMethodsBlockButton:
                        "text-[14px] text-cyan-500 hover:text-cyan-400 font-[600]",
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
