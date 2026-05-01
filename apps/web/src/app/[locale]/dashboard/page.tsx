"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Download, Search } from "lucide-react";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { exportAllCases, getCaseById, getCaseSummaries, normalizeCaseOutcome, updateCaseInStorage } from "@/lib/api";
import type { CaseData, CaseOutcome, CaseSummary } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function formatDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function buildSearchIndex(summary: CaseSummary, caseData: CaseData | null, locale: string) {
  const date = new Date(summary.timestamp);
  const dateStrings = [
    date.toISOString(),
    date.toISOString().slice(0, 10),
    date.toLocaleDateString(locale),
    date.toLocaleString(locale),
    date.toLocaleDateString("en-CA"),
  ];

  const rankingStrings = caseData?.rankings.flatMap((rank) => [
    rank.name,
    String(rank.orpha_code),
    ...(rank.contributing_terms ?? []),
    ...(rank.missing_terms ?? []),
    ...(rank.distinguishing_terms ?? []),
  ]) ?? [];

  const hpoStrings = caseData?.hpoTerms.flatMap((term) => [
    term.hpo_id,
    term.source,
  ]) ?? [];

  return [
    summary.patientName,
    summary.topDiagnosis,
    summary.status,
    summary.modalities.join(" "),
    summary.hpoCount.toString(),
    summary.timestamp.toString(),
    caseData?.notes,
    caseData?.patientContext?.patientName,
    caseData?.patientContext?.age,
    caseData?.patientContext?.sex,
    caseData?.outcome,
    ...dateStrings,
    ...rankingStrings,
    ...hpoStrings,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function ConfidenceBadge({ value }: { value: number }) {
  const t = useTranslations("dashboard");
  const color =
    value >= 80 ? "oklch(0.52 0.19 160)" :
    value >= 60 ? "oklch(0.52 0.21 255)" :
    "oklch(0.65 0.18 50)";
  return (
    <span
      className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: `${color}15`, color }}
    >
      {value.toFixed(0)}% {t("matchLabel")}
    </span>
  );
}

function OutcomeButton({
  active,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  tone: "neutral" | "success" | "danger";
}) {
  const toneClasses =
    tone === "success"
      ? active
        ? "border-[oklch(0.52_0.19_160/0.28)] bg-[oklch(0.52_0.19_160/0.1)] text-[oklch(0.35_0.15_160)]"
        : "border-black/[0.06] bg-white text-muted-foreground hover:border-[oklch(0.52_0.19_160/0.18)] hover:text-[oklch(0.35_0.15_160)]"
      : tone === "danger"
        ? active
          ? "border-[oklch(0.64_0.23_28/0.26)] bg-[oklch(0.64_0.23_28/0.1)] text-[oklch(0.55_0.22_28)]"
          : "border-black/[0.06] bg-white text-muted-foreground hover:border-[oklch(0.64_0.23_28/0.18)] hover:text-[oklch(0.55_0.22_28)]"
        : active
          ? "border-black/[0.12] bg-black/[0.05] text-foreground"
          : "border-black/[0.06] bg-white text-muted-foreground hover:border-black/[0.12] hover:text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${toneClasses}`}
    >
      {label}
    </button>
  );
}

function CaseCard({
  c,
  index,
  locale,
  onOutcomeChange,
}: {
  c: CaseSummary;
  index: number;
  locale: string;
  onOutcomeChange: (id: string, status: CaseOutcome) => void;
}) {
  const t = useTranslations("dashboard");
  const caseData = getCaseById(c.id);
  const status = normalizeCaseOutcome(c.status ?? caseData?.outcome);

  const modalityLabel: Record<string, string> = {
    notes: t("modalityNotes"),
    photo: t("modalityPhoto"),
    lab: t("modalityLab"),
    vcf: t("modalityVcf"),
  };

  const statusLabels: Record<CaseOutcome, string> = {
    pending: t("statusPending"),
    confirmed: t("confirmed"),
    ruled_out: t("ruledOut"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.06 }}
      whileHover={{ y: -2, boxShadow: "0 8px 40px oklch(0 0 0/0.08)" }}
      className="bg-white rounded-2xl border border-black/[0.06] p-5 transition-shadow"
    >
      <Link href={`/case/${c.id}`} className="block">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] tracking-tight truncate">{c.topDiagnosis}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {c.patientName && (
                <span className="text-[12px] text-foreground/70 font-medium truncate max-w-[160px]">{c.patientName}</span>
              )}
              <span className="text-muted-foreground/30 text-[11px]">·</span>
              <p className="text-[12px] text-muted-foreground">{formatDate(c.timestamp, locale)}</p>
            </div>
          </div>
          <ConfidenceBadge value={c.confidence} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {c.modalities.map((m) => (
            <span
              key={m}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[oklch(0.97_0_0)] border border-black/[0.06] text-muted-foreground"
            >
              {modalityLabel[m] ?? m}
            </span>
          ))}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {t("hpoTerms", { count: c.hpoCount })}
          </span>
        </div>
      </Link>

      <div className="mt-3 pt-3 border-t border-black/[0.06] flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground mr-1">{t("outcomeLabel")}</span>
        <OutcomeButton
          active={status === "pending"}
          label={statusLabels.pending}
          tone="neutral"
          onClick={() => onOutcomeChange(c.id, "pending")}
        />
        <OutcomeButton
          active={status === "confirmed"}
          label={statusLabels.confirmed}
          tone="success"
          onClick={() => onOutcomeChange(c.id, "confirmed")}
        />
        <OutcomeButton
          active={status === "ruled_out"}
          label={statusLabels.ruled_out}
          tone="danger"
          onClick={() => onOutcomeChange(c.id, "ruled_out")}
        />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  const t = useTranslations("dashboard");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full bg-[oklch(0.52_0.21_255/0.08)] float" />
        <div className="absolute inset-3 rounded-full bg-[oklch(0.52_0.21_255/0.12)] flex items-center justify-center float-delayed">
          <svg className="w-8 h-8 text-[oklch(0.52_0.21_255)]" fill="none" viewBox="0 0 24 24">
            <path
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <h3 className="text-[17px] font-semibold mb-2">{t("noCases")}</h3>
      <p className="text-[14px] text-muted-foreground max-w-xs mb-8">
        {t("emptyStateDesc")}
      </p>
      <Link href="/intake">
        <Button className="rounded-full bg-foreground text-background px-6 h-10">
          {t("startFirst")}
        </Button>
      </Link>
    </motion.div>
  );
}

function NoMatchesState() {
  const t = useTranslations("dashboard");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-black/[0.04] flex items-center justify-center mb-4">
        <Search className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-[16px] font-semibold mb-2">{t("noMatches")}</h3>
      <p className="text-[14px] text-muted-foreground max-w-sm">
        {t("noMatchesDesc")}
      </p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [cases, setCases] = useState<CaseSummary[]>(() => getCaseSummaries());
  const [confirmClear, setConfirmClear] = useState(false);
  const [search, setSearch] = useState("");

  const searchableCases = useMemo(() => {
    return cases.map((summary) => {
      const caseData = getCaseById(summary.id);
      return {
        summary,
        searchIndex: buildSearchIndex(summary, caseData, locale),
      };
    });
  }, [cases, locale]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return cases;
    return searchableCases
      .filter((entry) => entry.searchIndex.includes(query))
      .map((entry) => entry.summary);
  }, [cases, search, searchableCases]);

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    const keys = Object.keys(localStorage).filter((key) => key.startsWith("lumina_case_"));
    keys.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("lumina_cases");
    setCases([]);
    setSearch("");
    setConfirmClear(false);
  };

  const handleOutcomeChange = (id: string, status: CaseOutcome) => {
    const normalizedStatus = normalizeCaseOutcome(status);
    const caseData = getCaseById(id);

    if (caseData) {
      updateCaseInStorage(id, { ...caseData, outcome: normalizedStatus });
    } else {
      const summaries = getCaseSummaries();
      const idx = summaries.findIndex((summary) => summary.id === id);
      if (idx >= 0) {
        summaries[idx] = { ...summaries[idx], status: normalizedStatus };
        localStorage.setItem("lumina_cases", JSON.stringify(summaries.slice(0, 50)));
      }
    }

    setCases(getCaseSummaries());
  };

  const totalVisible = filtered.length;

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center justify-between gap-4 mb-8 pt-4"
        >
          <div>
            <h1 className="serif text-[28px] tracking-tight">{t("title")}</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              {cases.length > 0 ? t("casesTotal", { count: cases.length }) : t("subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {cases.length > 0 && (
              <button
                type="button"
                onClick={exportAllCases}
                className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 h-9 rounded-full border border-black/[0.08] bg-white text-foreground hover:border-black/[0.16] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t("exportJson")}</span>
              </button>
            )}
            <Link href="/intake">
              <Button className="rounded-full bg-foreground text-background h-9 px-5 text-[13px]">
                {t("newCase")}
              </Button>
            </Link>
          </div>
        </motion.div>

        {cases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease, delay: 0.08 }}
            className="mb-8"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-black/10 text-[13px] outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all bg-white"
              />
            </div>
          </motion.div>
        )}

        {cases.length > 0 && totalVisible > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease, delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {[
              { label: t("totalCases"), value: totalVisible.toString() },
              { label: t("avgConfidence"), value: `${Math.round(filtered.reduce((sum, item) => sum + item.confidence, 0) / totalVisible)}%` },
              { label: t("hpoAvg"), value: Math.round(filtered.reduce((sum, item) => sum + item.hpoCount, 0) / totalVisible).toString() },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.07, duration: 0.4 }}
                className="bg-white rounded-xl border border-black/[0.06] px-4 py-3"
              >
                <div className="text-[22px] font-bold tracking-tight">{stat.value}</div>
                <div className="text-[12px] text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <AnimatePresence>
          {cases.length > 0 ? (
            filtered.length > 0 ? (
              <div className="grid gap-3">
                {filtered.map((c, i) => (
                  <CaseCard
                    key={c.id}
                    c={c}
                    index={i}
                    locale={locale}
                    onOutcomeChange={handleOutcomeChange}
                  />
                ))}
              </div>
            ) : (
              <NoMatchesState />
            )
          ) : (
            <EmptyState />
          )}
        </AnimatePresence>

        {cases.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-10 pt-6 border-t border-black/[0.06] flex items-center justify-end gap-3"
          >
            <AnimatePresence mode="wait">
              {confirmClear ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-[13px] text-muted-foreground">
                    {t("deleteAllConfirm", { count: cases.length })}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[13px] font-medium text-red-500 hover:text-red-600 transition-colors"
                  >
                    {t("yesDeleteAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("cancel")}
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="button"
                  onClick={handleClearAll}
                  className="text-[12px] text-muted-foreground hover:text-red-500 transition-colors"
                >
                  {t("clearAll")}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
