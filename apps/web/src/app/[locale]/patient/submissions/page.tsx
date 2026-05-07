"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { getPatientSubmissions, updatePatientSubmission } from "@/lib/api";
import type { PatientSubmission } from "@/types/lumina";

export default function PatientSubmissionsPage() {
  const locale = useLocale();
  const [submissions, setSubmissions] = useState<PatientSubmission[]>(() => getPatientSubmissions());

  function markApproved(id: string) {
    updatePatientSubmission(id, { status: "approved" });
    setSubmissions(getPatientSubmissions());
  }

  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Patient submissions</p>
            <h1 className="mt-2 text-[40px] font-bold tracking-[-0.04em]">Submitted evidence</h1>
          </div>
          <Link href={`/${locale}/patient/new`} className="rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">New submission</Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#e5e8f0]">
          {submissions.length ? (
            <table className="w-full min-w-[720px] text-left text-[14px]">
              <thead className="bg-[#f7f9fc] text-[12px] uppercase tracking-[0.04em] text-[#73798a]">
                <tr><th className="px-5 py-3">Submission</th><th className="px-5 py-3">Patient</th><th className="px-5 py-3">Evidence</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Updated</th><th className="px-5 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-[#eef1f6]">
                {submissions.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-bold text-[#2536a0]">{item.id.slice(0, 8)}</td>
                    <td className="px-5 py-4">{item.patientName ?? "Unnamed patient"}</td>
                    <td className="px-5 py-4">{[item.notes && "notes", item.photoFileName && "photo", item.labFileName && "lab", item.geneticEvidence && "genetic"].filter(Boolean).join(", ")}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-[#eaf6ff] px-3 py-1 text-[12px] font-bold text-[#2536a0]">{item.status.replaceAll("_", " ")}</span></td>
                    <td className="px-5 py-4 text-[#6a7080]">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.timestamp))}</td>
                    <td className="px-5 py-4">
                      {item.status === "approved" || item.status === "scorecard_ready" ? (
                        <Link href={`/${locale}/patient/reports`} className="font-bold text-[#20aeea]">View report</Link>
                      ) : (
                        <button type="button" onClick={() => markApproved(item.id)} className="rounded border border-[#cfd5e2] px-3 py-2 text-[12px] font-bold text-[#2536a0]">
                          Doctor approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center">
              <h2 className="text-[24px] font-bold">No submissions yet</h2>
              <Link href={`/${locale}/patient/new`} className="mt-6 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Create submission</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
