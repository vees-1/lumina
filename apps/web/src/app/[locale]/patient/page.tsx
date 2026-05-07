"use client";

import Link from "next/link";
import { DashboardNav } from "@/components/nav";
import { IntakeUploadCard, PatientStatusTimeline, dashboardIcons } from "@/components/lumina/practo-ui";

export default function PatientDashboardPage() {
  const { FileText, ImageIcon, FlaskConical, PencilLine } = dashboardIcons;

  return (
    <div className="min-h-screen bg-white">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Patient pre-intake</p>
          <h1 className="mt-2 text-[40px] font-bold tracking-[-0.03em] text-[#2f3037]">Submit evidence for doctor review</h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-7 text-[#555b6d]">
            Patients can organize evidence before the visit. Lumina only generates scorecards after a doctor accepts the suggested HPO terms.
          </p>
        </div>

        <PatientStatusTimeline />

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <IntakeUploadCard icon={<FileText className="h-6 w-6" />} title="Notes" description="Symptoms, timeline, previous diagnoses, and visit questions." />
          <IntakeUploadCard icon={<ImageIcon className="h-6 w-6" />} title="Photos" description="Optional phenotype photos that remain pending doctor review." />
          <IntakeUploadCard icon={<FlaskConical className="h-6 w-6" />} title="Lab reports" description="Reports, discharge summaries, imaging notes, or PDFs." />
          <IntakeUploadCard icon={<PencilLine className="h-6 w-6" />} title="Genetic evidence" description="Gene panel notes, variant summary, or inheritance context." />
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg border border-[#e5e8f0] bg-white p-7">
            <h2 className="text-[25px] font-bold tracking-[-0.02em] text-[#2f3037]">Submitted cases</h2>
            <div className="mt-5 overflow-hidden rounded-lg border border-[#e5e8f0]">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-[#f7f9fc] text-[12px] uppercase tracking-[0.04em] text-[#73798a]">
                  <tr>
                    <th className="px-5 py-3">Case</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f6]">
                  {[
                    ["PAT-101", "Doctor review pending", "Today"],
                    ["PAT-095", "Approved", "May 4"],
                    ["PAT-088", "Scorecard ready", "Apr 29"],
                  ].map(([id, status, updated]) => (
                    <tr key={id}>
                      <td className="px-5 py-4 font-semibold text-[#2536a0]">{id}</td>
                      <td className="px-5 py-4 text-[#343741]">{status}</td>
                      <td className="px-5 py-4 text-[#6a7080]">{updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-lg border border-[#e5e8f0] bg-[#f8fbff] p-7">
            <h2 className="text-[23px] font-bold tracking-[-0.02em] text-[#2f3037]">Approved reports</h2>
            <p className="mt-2 text-[15px] leading-6 text-[#62687a]">Scorecards become visible only when the doctor approves the HPO evidence.</p>
            <Link href="/dashboard" className="mt-6 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">
              View sample scorecard
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}
