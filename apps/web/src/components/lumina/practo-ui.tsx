"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Check, FileText, FlaskConical, Image as ImageIcon, PencilLine, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function LuminaLogo({ className, footer = false }: { className?: string; footer?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-extrabold tracking-[-0.04em] text-[#24328f]",
        footer ? "text-5xl" : "text-[30px] leading-none",
        className
      )}
      aria-label="Lumina"
    >
      <span className="h-2 w-2 rounded-full bg-[#43b9e8]" />
      <span>Lumina</span>
      <span className="h-2 w-2 rounded-full bg-[#43b9e8]" />
    </span>
  );
}

export function MarketingFooter() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";
  const groups = [
    {
      title: "Lumina",
      links: [
        { label: "About", href: "about" },
        { label: "Clinical beta", href: "clinical-beta" },
        { label: "Contact Us", href: "support" },
      ],
    },
    {
      title: "For doctors",
      links: [
        { label: "Start rare disease case", href: "new-case" },
        { label: "Review HPO findings", href: "new-case" },
        { label: "Generate referral letter", href: "results" },
        { label: "View case dashboard", href: "dashboard" },
      ],
    },
    {
      title: "Modalities",
      links: [
        { label: "Clinical notes", href: "new-case?tab=notes" },
        { label: "Photos", href: "new-case?tab=photo" },
        { label: "Lab reports", href: "new-case?tab=lab" },
        { label: "Genetic evidence", href: "new-case?tab=genetic" },
      ],
    },
    {
      title: "Knowledge graph",
      links: [
        { label: "Orphanet", href: "rare-disease-scoring" },
        { label: "HPO Ontology", href: "hpo-workflow" },
        { label: "ClinVar", href: "fhir-export" },
      ],
    },
    {
      title: "More",
      links: [
        { label: "Help", href: "support" },
        { label: "Privacy Policy", href: "privacy" },
        { label: "Terms", href: "terms" },
        { label: "Security", href: "privacy" },
      ],
    },
    {
      title: "Clinical",
      links: [
        { label: "Doctor workspace", href: "dashboard" },
        { label: "Patient intake", href: "patient-dashboard" },
        { label: "Scorecard review", href: "results" },
        { label: "Referral output", href: "referral-letters" },
      ],
    },
  ];

  return (
    <footer className="mt-24 bg-[#283691] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-[14px] font-bold">{group.title}</h3>
              <ul className="space-y-2 text-[14px] leading-tight text-white/90">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={`/${locale}/${link.href}`} className="transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center gap-5">
          <LuminaLogo footer className="text-white" />
          <p className="text-[13px] text-white/65">Copyright © 2026, Lumina. Doctor-reviewed rare disease triage.</p>
        </div>
      </div>
    </footer>
  );
}

export function ServiceCard({
  image,
  title,
  description,
  href,
  objectPosition = "center center",
}: {
  image: string;
  title: string;
  description: string;
  href: string;
  objectPosition?: string;
}) {
  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.11)] transition-transform hover:-translate-y-1"
    >
      <div className="relative h-44 w-full bg-[#e9f5fb]">
        <Image src={image} alt="" fill sizes="(max-width: 768px) 90vw, 220px" className="object-cover" style={{ objectPosition }} />
      </div>
      <div className="p-5">
        <h3 className="text-[23px] font-bold leading-[1.05] tracking-[-0.02em] text-[#2f3037]">{title}</h3>
        <p className="mt-3 text-[15px] leading-6 text-[#666b7c]">{description}</p>
      </div>
    </Link>
  );
}

type EvidenceKind = "notes" | "photos" | "labs" | "genetics" | "approval" | "letter";

function PrototypeIllustration({ kind }: { kind: EvidenceKind }) {
  return (
    <svg viewBox="0 0 124 124" className="h-[124px] w-[124px]" aria-hidden="true">
      <circle cx="62" cy="62" r="62" fill="#e9eefc" />
      {kind === "notes" && (
        <>
          <rect x="34" y="29" width="56" height="68" rx="7" fill="#fff" stroke="#d7dff4" strokeWidth="2" />
          <path d="M45 45h34M45 58h34M45 71h28" stroke="#8ba0d8" strokeWidth="3" />
          <rect x="73" y="85" width="28" height="8" rx="4" fill="#14bef0" transform="rotate(-28 73 85)" />
        </>
      )}
      {kind === "photos" && (
        <>
          <rect x="32" y="37" width="68" height="52" rx="7" fill="#fff" stroke="#d7dff4" strokeWidth="2" />
          <circle cx="51" cy="55" r="9" fill="#14bef0" />
          <path d="M40 80l20-19 11 13 12-10 14 16H40z" fill="#8ba0d8" />
          <path d="M40 80l20-19 11 13 12-10 14 16H40z" fill="#14bef0" opacity=".75" />
        </>
      )}
      {kind === "labs" && (
        <>
          <rect x="36" y="27" width="54" height="70" rx="7" fill="#fff" stroke="#d7dff4" strokeWidth="2" />
          <path d="M48 42h30M48 54h30M48 66h18" stroke="#8ba0d8" strokeWidth="3" />
          <circle cx="73" cy="81" r="9" fill="#14bef0" />
          <circle cx="52" cy="81" r="9" fill="#14bef0" opacity=".25" />
        </>
      )}
      {kind === "genetics" && (
        <>
          <path d="M48 24c23 22 33 53 12 76" stroke="#28328c" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M76 24C53 46 43 77 64 100" stroke="#14bef0" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M49 35h27M44 51h38M43 68h38M49 85h27" stroke="#8ba0d8" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {kind === "approval" && (
        <>
          <circle cx="62" cy="62" r="32" fill="#fff" stroke="#d7dff4" strokeWidth="2" />
          <path d="M46 64l13 13 27-31" stroke="#14bef0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
      {kind === "letter" && (
        <>
          <rect x="31" y="38" width="64" height="48" rx="7" fill="#fff" stroke="#d7dff4" strokeWidth="2" />
          <path d="M32 40l31 24 31-24M32 84l24-21M94 84L70 63" stroke="#d7dff4" strokeWidth="2" fill="none" />
          <circle cx="88" cy="86" r="13" fill="#14bef0" />
          <circle cx="88" cy="86" r="7" fill="#fff" opacity=".55" />
        </>
      )}
    </svg>
  );
}

export function EvidenceModuleCard({
  kind,
  title,
  action,
}: {
  kind: EvidenceKind;
  title: string;
  action: string;
}) {
  return (
    <button className="group flex min-w-[135px] flex-col items-center gap-3 text-center">
      <span className="transition-transform group-hover:scale-105"><PrototypeIllustration kind={kind} /></span>
      <span className="text-[15px] font-bold text-[#3b3d45]">{title}</span>
      <span className="text-[14px] font-semibold text-[#20aeea]">{action}</span>
    </button>
  );
}

export function DashboardShell({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  children,
}: {
  title: string;
  subtitle: string;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-[40px] font-bold tracking-[-0.03em] text-[#2f3037]">{title}</h1>
        <p className="max-w-2xl text-[17px] leading-7 text-[#555b6d]">{subtitle}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[245px_1fr]">
        <aside className="rounded-lg border border-[#e5e8f0] bg-white p-2 lg:sticky lg:top-24 lg:self-start">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                "mb-1 flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-[14px] font-semibold transition-colors",
                activeTab === tab ? "bg-[#eaf6ff] text-[#2536a0]" : "text-[#4a4d59] hover:bg-[#f7f9fc]"
              )}
            >
              {tab}
            </button>
          ))}
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}

export function CaseTable({ rows }: { rows: Array<{ id: string; patient: string; status: string; updated: string; hpo: number; top: string }> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e5e8f0] bg-white">
      <table className="w-full min-w-[720px] text-left text-[14px]">
        <thead className="bg-[#f7f9fc] text-[12px] uppercase tracking-[0.04em] text-[#73798a]">
          <tr>
            <th className="px-5 py-3">Case</th>
            <th className="px-5 py-3">Patient</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Accepted HPO</th>
            <th className="px-5 py-3">Top result</th>
            <th className="px-5 py-3">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef1f6]">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-[#fbfcfe]">
              <td className="px-5 py-4 font-semibold text-[#2536a0]">{row.id}</td>
              <td className="px-5 py-4 text-[#343741]">{row.patient}</td>
              <td className="px-5 py-4">
                <span className="rounded-full bg-[#eaf6ff] px-3 py-1 text-[12px] font-semibold text-[#2536a0]">{row.status}</span>
              </td>
              <td className="px-5 py-4 text-[#343741]">{row.hpo}</td>
              <td className="px-5 py-4 text-[#343741]">{row.top}</td>
              <td className="px-5 py-4 text-[#6a7080]">{row.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HpoApprovalQueue() {
  const [suggestions, setSuggestions] = useState([
    { term: "HP:0001250 Seizure", source: "Clinical notes", confidence: "High" },
    { term: "HP:0001249 Intellectual disability", source: "Patient history", confidence: "Medium" },
    { term: "HP:0004322 Short stature", source: "Growth chart", confidence: "High" },
    { term: "HP:0001508 Failure to thrive", source: "Lab report and notes", confidence: "Review" },
  ]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);

  function mark(term: string, status: "accepted" | "rejected") {
    if (status === "accepted") {
      setAccepted((items) => [...new Set([...items, term])]);
      setRejected((items) => items.filter((item) => item !== term));
    } else {
      setRejected((items) => [...new Set([...items, term])]);
      setAccepted((items) => items.filter((item) => item !== term));
    }
  }

  return (
    <div className="space-y-3">
      {suggestions.map((item) => (
        <div key={item.term} className="rounded-lg border border-[#e5e8f0] bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[17px] font-bold text-[#2f3037]">{item.term}</h3>
              <p className="mt-1 text-[14px] text-[#62687a]">{item.source} · {item.confidence} confidence</p>
              {(accepted.includes(item.term) || rejected.includes(item.term)) && (
                <p className={cn("mt-2 text-[12px] font-bold uppercase tracking-[0.04em]", accepted.includes(item.term) ? "text-[#16940a]" : "text-[#bd2f2f]")}>
                  {accepted.includes(item.term) ? "Accepted for scoring" : "Rejected from scoring"}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => mark(item.term, "accepted")} className="rounded-md bg-[#38b6e8] px-4 py-2 text-[13px] font-bold text-white">Approve</button>
              <button type="button" onClick={() => mark(item.term, "rejected")} className="rounded-md border border-[#dce2ee] px-4 py-2 text-[13px] font-bold text-[#414653]">Reject</button>
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt("Edit HPO term", item.term);
                  if (!next) return;
                  setSuggestions((items) => items.map((suggestion) => suggestion.term === item.term ? { ...suggestion, term: next } : suggestion));
                }}
                className="rounded-md border border-[#dce2ee] px-4 py-2 text-[13px] font-bold text-[#414653]"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PatientStatusTimeline({ status = "Doctor review pending" }: { status?: string }) {
  const steps = ["Submitted", "Doctor review pending", "Approved", "Scorecard ready"];
  const activeIndex = Math.max(0, steps.indexOf(status));
  return (
    <div className="rounded-lg border border-[#e5e8f0] bg-white p-6">
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold", index <= activeIndex ? "bg-[#38b6e8] text-white" : "bg-[#edf2ff] text-[#8c94aa]")}>
              {index < activeIndex ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className="text-[14px] font-semibold text-[#3d414d]">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IntakeUploadCard({ icon, title, description, href }: { icon: ReactNode; title: string; description: string; href?: string }) {
  const body = (
    <>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#eaf6ff] text-[#2536a0]">{icon}</div>
      <h3 className="text-[20px] font-bold tracking-[-0.02em] text-[#2f3037]">{title}</h3>
      <p className="mt-2 min-h-[48px] text-[14px] leading-6 text-[#62687a]">{description}</p>
      <span className="mt-5 block w-full rounded-md border border-dashed border-[#9eb0ce] bg-[#f8fbff] px-4 py-4 text-center text-[14px] font-semibold text-[#2536a0]">
        Upload or enter evidence
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-lg border border-[#e5e8f0] bg-white p-6 transition-transform hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-[#e5e8f0] bg-white p-6">
      {body}
    </div>
  );
}

export const dashboardIcons = { FileText, ImageIcon, FlaskConical, PencilLine, ShieldCheck, Users };
