"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { CaseTable, DashboardShell, HpoApprovalQueue, IntakeUploadCard, dashboardIcons } from "@/components/lumina/practo-ui";
import { getCaseSummaries } from "@/lib/api";

const tabs = ["My cases", "Evidence intake", "HPO approval", "Output letters", "Team queue", "Doctor profile"];

const tabHashes = new Map([
  ["my-cases", "My cases"],
  ["evidence-intake", "Evidence intake"],
  ["hpo-approval", "HPO approval"],
  ["output-letters", "Output letters"],
  ["team-queue", "Team queue"],
  ["doctor-profile", "Doctor profile"],
]);

function getTabFromHash() {
  if (typeof window === "undefined") return tabs[0];
  const hash = window.location.hash.replace("#", "");
  return tabHashes.get(hash) ?? tabs[0];
}

function getHashFromTab(tab: string) {
  return tab.toLowerCase().replace(/\s+/g, "-");
}

const fallbackRows = [
  { id: "LM-2048", patient: "Avery Stone", status: "HPO review", updated: "Today, 10:40", hpo: 14, top: "Kabuki syndrome" },
  { id: "LM-2047", patient: "Mila Reyes", status: "Letter ready", updated: "Yesterday", hpo: 11, top: "Noonan syndrome" },
  { id: "LM-2046", patient: "Ethan Blake", status: "Evidence intake", updated: "May 4", hpo: 8, top: "Rasopathy panel review" },
];

function StatsGrid({ rows }: { rows: typeof fallbackRows }) {
  const stats = [
    { label: "Total cases seen", value: rows.length.toString() },
    { label: "Active cases today", value: rows.filter((row) => row.updated.includes("Today")).length.toString() },
    { label: "Pending HPO terms", value: "17" },
    { label: "Letters ready", value: rows.filter((row) => row.status === "Letter ready").length.toString() },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-[#e5e8f0] bg-white p-5">
          <p className="text-[31px] font-bold tracking-[-0.03em] text-[#2536a0]">{stat.value}</p>
          <p className="mt-1 text-[14px] text-[#62687a]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function MyCases({ rows, locale }: { rows: typeof fallbackRows; locale: string }) {
  return (
    <div className="space-y-6">
      <StatsGrid rows={rows} />
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[24px] font-bold tracking-[-0.02em] text-[#2f3037]">Case history</h2>
          <Link href={`/${locale}/intake`} className="rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">
            New case
          </Link>
        </div>
        <CaseTable rows={rows} />
      </div>
    </div>
  );
}

function EvidenceIntake({ locale }: { locale: string }) {
  const { FileText, ImageIcon, FlaskConical, PencilLine } = dashboardIcons;
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e5e8f0] bg-white p-7">
        <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[#2f3037]">Collect evidence for doctor review</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#62687a]">
          Add the evidence the patient brings into the clinic. Lumina can suggest HPO terms, but nothing reaches scoring until a clinician accepts it.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <IntakeUploadCard href={`/${locale}/intake?tab=notes`} icon={<FileText className="h-6 w-6" />} title="Clinical notes" description="Paste visit notes, history, exam observations, and physician comments." />
        <IntakeUploadCard href={`/${locale}/intake?tab=photo`} icon={<ImageIcon className="h-6 w-6" />} title="Patient photos" description="Add phenotype photos for clinician-reviewed trait suggestions." />
        <IntakeUploadCard href={`/${locale}/intake?tab=lab`} icon={<FlaskConical className="h-6 w-6" />} title="Lab reports" description="Upload CBC, metabolic, imaging, and diagnostic reports for extraction." />
        <IntakeUploadCard href={`/${locale}/intake?tab=genetic`} icon={<PencilLine className="h-6 w-6" />} title="Genetic evidence" description="Record gene panel findings, variant notes, inheritance context, or ClinVar evidence." />
      </div>
    </div>
  );
}

function OutputLetters() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-[#e5e8f0] bg-white p-7">
        <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[#2f3037]">Scorecard and referral summary</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {["Accepted HPO terms: 14", "Ranked diseases: 10", "Referral draft: Ready"].map((item) => (
            <div key={item} className="rounded-md border border-[#e5e8f0] p-4 text-[14px] font-semibold text-[#2536a0]">{item}</div>
          ))}
        </div>
        <div className="mt-6 rounded-md bg-[#f8fbff] p-5">
          <h3 className="text-[18px] font-bold text-[#2f3037]">Generated referral entry point</h3>
          <p className="mt-2 text-[14px] leading-6 text-[#62687a]">
            In the final workflow, this appears after Orphanet matching inside the results view. It uses the saved doctor profile, accepted HPO terms, ranked differentials, and evidence trail.
          </p>
          <button className="mt-5 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">
            Generate from approved results
          </button>
        </div>
      </section>
      <aside className="rounded-lg border border-[#e5e8f0] bg-white p-6">
        <h3 className="text-[20px] font-bold text-[#2f3037]">Top ranked diseases</h3>
        <ol className="mt-4 space-y-3 text-[14px] text-[#4f5668]">
          {["Kabuki syndrome", "Noonan syndrome", "CHARGE syndrome", "Rasopathy spectrum"].map((item, index) => (
            <li key={item} className="flex items-center justify-between border-b border-[#eef1f6] pb-3">
              <span>{index + 1}. {item}</span>
              <span className="font-bold text-[#2536a0]">{92 - index * 6}%</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function TeamQueue() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {[
        ["Needs review", "5 cases waiting for clinician HPO approval"],
        ["Patient updates", "2 pre-intake submissions added new evidence"],
        ["Letters pending", "3 referral letters need signature details"],
      ].map(([title, text]) => (
        <div key={title} className="rounded-lg border border-[#e5e8f0] bg-white p-6">
          <h3 className="text-[21px] font-bold text-[#2f3037]">{title}</h3>
          <p className="mt-3 text-[15px] leading-6 text-[#62687a]">{text}</p>
        </div>
      ))}
    </div>
  );
}

function DoctorProfilePanel() {
  return (
    <div className="rounded-lg border border-[#e5e8f0] bg-white p-7">
      <h2 className="text-[26px] font-bold tracking-[-0.02em] text-[#2f3037]">Doctor profile and letter defaults</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#62687a]">Manage doctor name, specialty, clinic, signature, and default referral preferences.</p>
      <Link href="/settings/profile" className="mt-6 inline-flex rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">
        Edit doctor profile
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const rows = useMemo(() => {
    if (typeof window === "undefined") return fallbackRows;
    const stored = getCaseSummaries();
    if (!stored.length) return fallbackRows;
    return stored.map((item, index) => ({
      id: item.id,
      patient: item.patientName ?? `Patient ${index + 1}`,
      status: item.status === "confirmed" ? "Letter ready" : item.status === "ruled_out" ? "Ruled out" : "HPO review",
      updated: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(item.timestamp)),
      hpo: item.hpoCount,
      top: item.topDiagnosis,
    }));
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${getHashFromTab(tab)}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardNav />
      <DashboardShell
        title="Doctor dashboard"
        subtitle="Run the original Lumina workflow in clinic: enter evidence, approve HPO terms, generate a scorecard, and prepare referral output."
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      >
        {activeTab === "My cases" && <MyCases rows={rows} locale={locale} />}
        {activeTab === "Evidence intake" && <EvidenceIntake locale={locale} />}
        {activeTab === "HPO approval" && <HpoApprovalQueue />}
        {activeTab === "Output letters" && <OutputLetters />}
        {activeTab === "Team queue" && <TeamQueue />}
        {activeTab === "Doctor profile" && <DoctorProfilePanel />}
      </DashboardShell>
    </div>
  );
}
