"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { getPatientSubmissions } from "@/lib/api";
import type { PatientSubmission } from "@/types/lumina";

export default function PatientReportsPage() {
  const locale = useLocale();
  const [reports] = useState<PatientSubmission[]>(() =>
    getPatientSubmissions().filter((item) => item.status === "approved" || item.status === "scorecard_ready")
  );

  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Patient reports</p>
          <h1 className="mt-2 text-[40px] font-bold tracking-[-0.04em]">Approved scorecards</h1>
          <p className="mt-2 max-w-2xl text-[16px] leading-7 text-[#62687a]">Only doctor-approved outputs appear here.</p>
        </div>
        {reports.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {reports.map((report) => (
              <div key={report.id} className="border border-[#e5e8f0] p-6">
                <h2 className="text-[22px] font-bold">{report.patientName ?? "Approved report"}</h2>
                <p className="mt-2 text-[14px] text-[#62687a]">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(report.timestamp))}</p>
                {report.linkedCaseId ? (
                  <Link href={`/${locale}/case/${report.linkedCaseId}`} className="mt-5 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Open scorecard</Link>
                ) : (
                  <p className="mt-5 text-[14px] font-semibold text-[#2536a0]">Approved by doctor</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-[#e5e8f0] p-10 text-center">
            <h2 className="text-[24px] font-bold">No approved reports yet</h2>
            <p className="mt-2 text-[#62687a]">Your scorecard will appear after doctor review.</p>
            <Link href={`/${locale}/patient/new`} className="mt-6 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Submit evidence</Link>
          </div>
        )}
      </main>
    </div>
  );
}
