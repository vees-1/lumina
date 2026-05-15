"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { RoleGuard } from "@/components/lumina/role-guard";
import { getPatientSubmissions, updatePatientSubmission } from "@/lib/api";
import type { PatientSubmission } from "@/types/lumina";
import { Plus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PatientSubmissionsPage() {
  const locale = useLocale();
  const t = useTranslations("patientSubmissions");
  const [submissions, setSubmissions] = useState<PatientSubmission[]>(() => getPatientSubmissions());

  function statusBadge(status: string) {
    if (status === "approved" || status === "scorecard_ready") {
      const label = status === "approved" ? t("statusApproved") : t("statusScorecardReady");
      return <span className="badge badge-accepted">{label}</span>;
    }
    if (status === "doctor_review_pending") return <span className="badge badge-amber">{t("reviewPending")}</span>;
    return <span className="badge badge-cyan">{t("statusSubmitted")}</span>;
  }

  function markApproved(id: string) {
    updatePatientSubmission(id, { status: "approved" });
    setSubmissions(getPatientSubmissions());
  }

  return (
    <RoleGuard allowed={["patient"]} redirectTo="/dashboard">
      <div className="min-h-screen bg-[#F7F8FA] text-[#0D1B2A]">
        <DashboardNav />
        <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-28">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="section-label mb-2">{t("title")}</p>
              <h1 className="text-[36px] font-normal tracking-[-0.03em]">{t("headline")}</h1>
            </div>
            <Link
              href={`/${locale}/patient/new`}
              className="inline-flex h-10 items-center gap-2 rounded bg-[#0AAFCE] px-5 text-[13px] font-normal text-white transition-colors hover:bg-[#0997B3]"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("newSubmission")}
            </Link>
          </div>

          <div className="overflow-hidden rounded border border-[#DDE3ED] bg-white">
            {submissions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="border-b border-[#DDE3ED] bg-[#F7F8FA]">
                    <tr>
                      {[t("colSubmission"), t("colPatient"), t("colEvidence"), t("colStatus"), t("colSubmitted"), t("colAction")].map((h) => (
                        <th key={h} className="px-5 py-3 text-[11px] font-normal uppercase tracking-[0.08em] text-[#8A94A6]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F2F5]">
                    {submissions.map((item) => (
                      <tr key={item.id} className={cn("transition-colors hover:bg-[#F7F8FA]")}>
                        <td className="px-5 py-4 font-normal text-[#0AAFCE]">{item.id.slice(0, 8)}</td>
                        <td className="px-5 py-4 text-[13.5px] text-[#0D1B2A]">{item.patientName ?? t("unnamedPatient")}</td>
                        <td className="px-5 py-4 text-[13px] text-[#4A5568]">
                          {[item.notes && t("notes"), item.photoFileName && t("photo"), item.labFileName && t("lab"), item.geneticEvidence && t("genetic")].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-5 py-4">{statusBadge(item.status)}</td>
                        <td className="px-5 py-4 text-[12.5px] text-[#8A94A6]">
                          {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.timestamp))}
                        </td>
                        <td className="px-5 py-4">
                          {item.status === "approved" || item.status === "scorecard_ready" ? (
                            <Link href={`/${locale}/patient/reports`} className="text-[13px] font-normal text-[#0AAFCE] hover:underline">
                              {t("viewReport")}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => markApproved(item.id)}
                              className="rounded border border-[#DDE3ED] px-3 py-1 text-[12px] font-normal text-[#4A5568] transition-colors hover:border-[#0AAFCE] hover:text-[#0D1B2A]"
                            >
                              {t("doctorApprove")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#F0F2F5]">
                  <Inbox className="h-6 w-6 text-[#8A94A6]" />
                </div>
                <h2 className="mt-4 text-[20px] font-normal">{t("noSubmissions")}</h2>
                <p className="mt-1.5 text-[14px] text-[#4A5568]">{t("noSubmissionsDesc")}</p>
                <Link
                  href={`/${locale}/patient/new`}
                  className="mt-6 inline-flex h-10 items-center rounded-none bg-[#0AAFCE] px-6 text-[13.5px] font-normal text-white transition-colors hover:bg-[#0997B3]"
                >
                  {t("createSubmission")}
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
