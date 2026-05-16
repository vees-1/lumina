"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { PatientStatusTimeline } from "@/components/lumina/practo-ui";
import { RoleGuard } from "@/components/lumina/role-guard";
import { getPatientSubmissions, getPatientSubmissionsRemote } from "@/lib/api";
import { useApiActor } from "@/lib/use-api-actor";
import type { PatientSubmission } from "@/types/lumina";
import { Plus, FileText } from "lucide-react";

export default function PatientDashboardPage() {
  const locale = useLocale();
  const t = useTranslations("patientDashboard");
  const actor = useApiActor();
  const [submissions] = useState<PatientSubmission[]>(() => getPatientSubmissions());
  const [remoteSubmissions, setRemoteSubmissions] = useState<PatientSubmission[] | null>(null);
  useEffect(() => {
    if (!actor) return;
    getPatientSubmissionsRemote(actor).then(setRemoteSubmissions).catch(() => setRemoteSubmissions(null));
  }, [actor]);
  const visibleSubmissions = remoteSubmissions ?? submissions;
  const latest = visibleSubmissions[0];
  const ready = visibleSubmissions.filter((item) => item.status === "released_to_patient").length;

  return (
    <RoleGuard allowed={["patient"]} redirectTo="/dashboard">
      <div className="min-h-screen bg-[#F7F8FA] text-[#0D1B2A]">
        <DashboardNav />
        <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-28">

          {/* Header */}
          <section className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="section-label mb-3">{t("title")}</p>
              <h1 className="text-[36px] font-normal leading-tight tracking-[-0.03em] sm:text-[42px]" dangerouslySetInnerHTML={{ __html: t("headline") }}></h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#4A5568]">
                {t("desc")}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/patient/new`}
                  className="inline-flex h-10 items-center gap-2 rounded bg-[#0AAFCE] px-6 text-[13.5px] font-normal text-white transition-colors hover:bg-[#0997B3]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("newSubmission")}
                </Link>
                <Link
                  href={`/${locale}/patient/reports`}
                  className="inline-flex h-10 items-center rounded border border-[#DDE3ED] bg-white px-6 text-[13.5px] font-normal text-[#0D1B2A] transition-colors hover:border-[#0D1B2A]"
                >
                  {t("approvedReports")}
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t("submittedCases"), value: visibleSubmissions.length },
                { label: t("approvedReports"), value: ready },
              ].map((s) => (
                <div key={s.label} className="rounded border border-[#DDE3ED] bg-white p-5 shadow-[0_2px_8px_rgba(13,27,42,0.04)]">
                  <p className="text-[34px] font-normal tracking-[-0.04em] text-[#0D1B2A]">{s.value}</p>
                  <p className="mt-0.5 text-[12px] font-normal text-[#8A94A6]">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Status timeline */}
          <section className="mt-12">
            <p className="mb-3 text-[12px] font-normal uppercase tracking-[0.08em] text-[#8A94A6]">{t("submissionStatus")}</p>
            <PatientStatusTimeline
              status={
                latest?.status === "released_to_patient"
                  ? t("statusScorecardReady")
                  : latest?.status === "approved"
                  ? t("statusApproved")
                  : latest
                  ? t("statusPending")
                  : t("statusSubmitted")
              }
            />
          </section>

          {/* Latest submission */}
          <section className="mt-8 rounded border border-[#DDE3ED] bg-white p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#E5F8FC]">
                  <FileText className="h-5 w-5 text-[#0AAFCE]" />
                </div>
                <div>
                  <h2 className="text-[17px] font-normal tracking-[-0.02em]">{t("latestSubmission")}</h2>
                  <p className="mt-1 text-[13.5px] text-[#4A5568]">
                    {latest
                      ? `${latest.patientName ?? t("unnamedPatient")} · ${
                          latest.status === "needs_more_data" ? t("statusNeedsMoreData") :
                          latest.status === "released_to_patient" ? t("statusScorecardReady") :
                          latest.status === "doctor_completed" ? t("statusDoctorCompleted") :
                          latest.status === "approved" ? t("statusApproved") :
                          t("statusPending")
                        }`
                      : t("noSubmissionDesc")}
                  </p>
                </div>
              </div>
              <Link
                href={`/${locale}/patient/submissions`}
                className="shrink-0 inline-flex h-10 items-center rounded border border-[#DDE3ED] bg-white px-5 text-[13px] font-normal text-[#0D1B2A] transition-colors hover:border-[#0AAFCE] hover:text-[#0AAFCE]"
              >
                {t("viewSubmissions")}
              </Link>
            </div>
          </section>
          {latest?.doctorMessage && (
            <section className="mt-4 rounded border border-[#D4860A]/30 bg-[#FEF8ED] p-5">
              <p className="text-[12px] font-normal uppercase tracking-[0.08em] text-[#D4860A]">{t("doctorRequestedMoreData")}</p>
              <p className="mt-2 text-[14px] leading-6 text-[#0D1B2A]">{latest.doctorMessage}</p>
            </section>
          )}
        </main>
      </div>
    </RoleGuard>
  );
}
