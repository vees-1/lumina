"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { RoleGuard } from "@/components/lumina/role-guard";
import { getPatientSubmissions } from "@/lib/api";
import type { PatientSubmission } from "@/types/lumina";
import { FileText, ExternalLink } from "lucide-react";

export default function PatientReportsPage() {
  const locale = useLocale();
  const t = useTranslations("patientReports");
  const [reports] = useState<PatientSubmission[]>(() =>
    getPatientSubmissions().filter((item) => item.status === "approved" || item.status === "scorecard_ready")
  );

  return (
    <RoleGuard allowed={["patient"]} redirectTo="/dashboard">
      <div className="min-h-screen bg-[#F7F8FA] text-[#0D1B2A]">
        <DashboardNav />
        <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-28">
          <div className="mb-8">
            <p className="section-label mb-2">{t("title")}</p>
            <h1 className="text-[36px] font-[800] tracking-[-0.03em]">{t("headline")}</h1>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-6 text-[#4A5568]">{t("subtitle")}</p>
          </div>

          {reports.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {reports.map((report) => (
                <div key={report.id} className="rounded-sm border border-[#DDE3ED] bg-white p-6 shadow-[0_2px_8px_rgba(13,27,42,0.04)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#EDFAF3]">
                      <FileText className="h-5 w-5 text-[#1A7F4B]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[16px] font-[800]">{report.patientName ?? t("defaultReportName")}</h2>
                        <span className="badge badge-accepted">{t("statusApproved")}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-[#8A94A6]">
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(report.timestamp))}
                      </p>
                      {report.linkedCaseId ? (
                        <Link
                          href={`/${locale}/case/${report.linkedCaseId}`}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-none bg-[#0AAFCE] px-5 py-2 text-[13px] font-[700] text-white transition-colors hover:bg-[#0997B3]"
                        >
                          {t("openScorecard")}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <p className="mt-4 text-[13px] font-[700] text-[#1A7F4B]">{t("approvedByDoctor")}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-[#DDE3ED] bg-white p-12 text-center shadow-[0_2px_8px_rgba(13,27,42,0.04)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-[#F0F2F5]">
                <FileText className="h-6 w-6 text-[#8A94A6]" />
              </div>
              <h2 className="mt-4 text-[20px] font-[800]">{t("noReports")}</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[14px] leading-6 text-[#4A5568]">
                {t("noReportsDesc")}
              </p>
              <Link
                href={`/${locale}/patient/new`}
                className="mt-6 inline-flex h-10 items-center rounded-none bg-[#0AAFCE] px-6 text-[13.5px] font-[700] text-white transition-colors hover:bg-[#0997B3]"
              >
                {t("submitEvidence")}
              </Link>
            </div>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
