"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { getCaseSummaries, getPatientSubmissions } from "@/lib/api";
import type { CaseSummary, PatientSubmission } from "@/types/lumina";

export default function DashboardPage() {
  const locale = useLocale();
  const [cases] = useState<CaseSummary[]>(() => getCaseSummaries());
  const [submissions] = useState<PatientSubmission[]>(() => getPatientSubmissions());
  const today = new Date().toDateString();
  const activeToday = cases.filter((item) => new Date(item.timestamp).toDateString() === today).length;
  const lettersReady = cases.filter((item) => item.status === "confirmed").length;

  const stats = [
    { label: "Total cases", value: cases.length },
    { label: "Active today", value: activeToday },
    { label: "Patient submissions", value: submissions.length },
    { label: "Letters ready", value: lettersReady },
  ];

  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <section className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Doctor dashboard</p>
            <h1 className="mt-3 text-[42px] font-bold leading-tight tracking-[-0.04em]">Run the Lumina clinical workflow from one place</h1>
            <p className="mt-4 max-w-xl text-[17px] leading-8 text-[#586074]">
              Start a case, review saved cases, open the latest results, and pick up patient submissions that still need doctor approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/new-case`} className="rounded bg-[#38b6e8] px-6 py-3 text-[15px] font-bold text-white">Start new case</Link>
              <Link href={`/${locale}/cases`} className="rounded border border-[#cfd5e2] px-6 py-3 text-[15px] font-bold text-[#343741]">View cases</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map((stat) => (
              <div key={stat.label} className="border border-[#e5e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
                <p className="text-[38px] font-bold tracking-[-0.04em] text-[#2536a0]">{stat.value}</p>
                <p className="mt-1 text-[14px] text-[#62687a]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          {[
            ["Cases", "Review every diagnosed case and reopen the full result page.", `/${locale}/cases`],
            ["New case", "Enter notes, photos, lab reports, and genetic evidence.", `/${locale}/new-case`],
            ["Scorecards", "Open top 10 differentials and referral output from saved cases.", `/${locale}/cases`],
          ].map(([title, text, href]) => (
            <Link key={title} href={href} className="border border-[#e5e8f0] bg-white p-7 transition-transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <h2 className="text-[25px] font-bold tracking-[-0.03em]">{title}</h2>
              <p className="mt-3 text-[15px] leading-7 text-[#62687a]">{text}</p>
              <span className="mt-6 inline-flex text-[15px] font-bold text-[#20aeea]">Open</span>
            </Link>
          ))}
        </section>

        <section className="mt-14 rounded-lg border border-[#e5e8f0] bg-[#f8fbff] p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[25px] font-bold tracking-[-0.03em]">Patient review queue</h2>
              <p className="mt-2 text-[15px] text-[#62687a]">Patient submissions stay pending until a doctor reviews and runs the diagnostic workflow.</p>
            </div>
            <Link href={`/${locale}/patient/submissions`} className="rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Open queue</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
