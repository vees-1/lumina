"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { exportAllCases, getCaseSummaries } from "@/lib/api";
import type { CaseSummary } from "@/types/lumina";

export default function CasesPage() {
  const locale = useLocale();
  const [cases] = useState<CaseSummary[]>(() => getCaseSummaries());

  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Cases</p>
            <h1 className="mt-2 text-[40px] font-bold tracking-[-0.04em]">My cases</h1>
            <p className="mt-2 text-[16px] text-[#62687a]">Every completed diagnostic workflow appears here after scoring.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={exportAllCases} className="rounded border border-[#cfd5e2] px-5 py-3 text-[14px] font-bold text-[#343741]">Export JSON</button>
            <Link href={`/${locale}/new-case`} className="rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">New case</Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="border border-[#e5e8f0] p-5"><p className="text-[32px] font-bold text-[#2536a0]">{cases.length}</p><p className="text-[14px] text-[#62687a]">Total cases</p></div>
          <div className="border border-[#e5e8f0] p-5"><p className="text-[32px] font-bold text-[#2536a0]">{cases.filter((item) => item.status === "pending").length}</p><p className="text-[14px] text-[#62687a]">Pending review</p></div>
          <div className="border border-[#e5e8f0] p-5"><p className="text-[32px] font-bold text-[#2536a0]">{cases.filter((item) => item.status === "confirmed").length}</p><p className="text-[14px] text-[#62687a]">Confirmed outputs</p></div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e5e8f0] bg-white">
          {cases.length ? (
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead className="bg-[#f7f9fc] text-[12px] uppercase tracking-[0.04em] text-[#73798a]">
                <tr>
                  <th className="px-5 py-3">Case</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Top result</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">HPO</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1f6]">
                {cases.map((item) => (
                  <tr key={item.id} className="hover:bg-[#fbfcfe]">
                    <td className="px-5 py-4"><Link href={`/${locale}/case/${item.id}`} className="font-bold text-[#2536a0]">{item.id.slice(0, 8)}</Link></td>
                    <td className="px-5 py-4">{item.patientName ?? "Unnamed patient"}</td>
                    <td className="px-5 py-4">{item.topDiagnosis}</td>
                    <td className="px-5 py-4">{item.confidence.toFixed(0)}%</td>
                    <td className="px-5 py-4">{item.hpoCount}</td>
                    <td className="px-5 py-4 text-[#6a7080]">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.timestamp))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center">
              <h2 className="text-[24px] font-bold">No cases yet</h2>
              <p className="mt-2 text-[#62687a]">Run a new case to populate the case history.</p>
              <Link href={`/${locale}/new-case`} className="mt-6 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Start first case</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
