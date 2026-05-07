"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { getCaseById, getCaseSummaries } from "@/lib/api";
import type { CaseData } from "@/types/lumina";

export default function ResultsPage() {
  const locale = useLocale();
  const [latest] = useState<CaseData | null>(() => {
    const summaries = getCaseSummaries();
    return summaries[0] ? getCaseById(summaries[0].id) : null;
  });

  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Results</p>
          <h1 className="mt-2 text-[40px] font-bold tracking-[-0.04em]">Diagnosis results and referral output</h1>
          <p className="mt-2 max-w-2xl text-[16px] leading-7 text-[#62687a]">Open the latest scorecard or select any saved case to review the top 10 differentials, disease details, and referral letter.</p>
        </div>

        {latest ? (
          <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="rounded-lg border border-[#e5e8f0] bg-white p-7">
              <h2 className="text-[26px] font-bold tracking-[-0.03em]">Latest case</h2>
              <p className="mt-1 text-[14px] text-[#62687a]">{latest.patientContext?.patientName ?? "Unnamed patient"} · {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(latest.timestamp))}</p>
              <div className="mt-6 space-y-3">
                {latest.rankings.slice(0, 10).map((rank, index) => (
                  <Link key={rank.orpha_code} href={`/${locale}/case/${latest.id}`} className="flex items-center justify-between rounded border border-[#e5e8f0] p-4 transition-colors hover:bg-[#f8fbff]">
                    <span className="font-bold text-[#2f3037]">{index + 1}. {rank.name}</span>
                    <span className="font-bold text-[#2536a0]">{rank.confidence.toFixed(0)}%</span>
                  </Link>
                ))}
              </div>
            </div>
            <aside className="rounded-lg border border-[#e5e8f0] bg-[#f8fbff] p-7">
              <h2 className="text-[23px] font-bold tracking-[-0.03em]">Open full result</h2>
              <p className="mt-3 text-[15px] leading-7 text-[#62687a]">The detailed result page contains HPO evidence, disease explainability, outcome controls, FHIR export, and referral letter generation.</p>
              <Link href={`/${locale}/case/${latest.id}`} className="mt-6 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Open scorecard</Link>
            </aside>
          </section>
        ) : (
          <div className="rounded-lg border border-[#e5e8f0] p-10 text-center">
            <h2 className="text-[24px] font-bold">No results yet</h2>
            <p className="mt-2 text-[#62687a]">Results appear only after a doctor accepts HPO terms and runs differential scoring.</p>
            <Link href={`/${locale}/new-case`} className="mt-6 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Start new case</Link>
          </div>
        )}
      </main>
    </div>
  );
}
