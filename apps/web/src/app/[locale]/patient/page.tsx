"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { PatientStatusTimeline } from "@/components/lumina/practo-ui";
import { getPatientSubmissions } from "@/lib/api";
import type { PatientSubmission } from "@/types/lumina";

export default function PatientDashboardPage() {
  const locale = useLocale();
  const [submissions] = useState<PatientSubmission[]>(() => getPatientSubmissions());
  const latest = submissions[0];
  const ready = submissions.filter((item) => item.status === "scorecard_ready" || item.status === "approved").length;

  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <section className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Patient dashboard</p>
            <h1 className="mt-3 text-[42px] font-bold leading-tight tracking-[-0.04em]">Submit evidence and wait for doctor approval</h1>
            <p className="mt-4 max-w-xl text-[17px] leading-8 text-[#586074]">Patients can organize notes, photos, lab reports, and genetic evidence. Scorecards appear only after a doctor reviews the HPO terms.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/patient/new`} className="rounded bg-[#38b6e8] px-6 py-3 text-[15px] font-bold text-white">New submission</Link>
              <Link href={`/${locale}/patient/reports`} className="rounded border border-[#cfd5e2] px-6 py-3 text-[15px] font-bold text-[#343741]">Approved reports</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-[#e5e8f0] p-6"><p className="text-[38px] font-bold text-[#2536a0]">{submissions.length}</p><p className="text-[14px] text-[#62687a]">Submitted cases</p></div>
            <div className="border border-[#e5e8f0] p-6"><p className="text-[38px] font-bold text-[#2536a0]">{ready}</p><p className="text-[14px] text-[#62687a]">Approved reports</p></div>
          </div>
        </section>

        <section className="mt-12">
          <PatientStatusTimeline status={latest?.status === "scorecard_ready" ? "Scorecard ready" : latest?.status === "approved" ? "Approved" : latest ? "Doctor review pending" : "Submitted"} />
        </section>

        <section className="mt-10 rounded-lg border border-[#e5e8f0] bg-white p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[25px] font-bold tracking-[-0.03em]">Latest submission</h2>
              <p className="mt-2 text-[15px] text-[#62687a]">{latest ? `${latest.patientName ?? "Unnamed patient"} · ${latest.status.replaceAll("_", " ")}` : "No patient evidence has been submitted yet."}</p>
            </div>
            <Link href={`/${locale}/patient/submissions`} className="rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">View submissions</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
