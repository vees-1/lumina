"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { getCaseSummaries } from "@/lib/api";
import type { CaseSummary } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const MODALITY_LABEL: Record<string, string> = {
  notes: "Notes", photo: "Photo", lab: "Lab", vcf: "Genomic",
};

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 80 ? "oklch(0.52 0.19 160)" :
    value >= 60 ? "oklch(0.52 0.21 255)" :
    "oklch(0.65 0.18 50)";
  return (
    <span
      className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: `${color}15`, color }}
    >
      {value.toFixed(0)}% match
    </span>
  );
}

function CaseCard({ c, index }: { c: CaseSummary; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.06 }}
      whileHover={{ y: -2, boxShadow: "0 8px 40px oklch(0 0 0/0.08)" }}
      className="bg-white rounded-2xl border border-black/[0.06] p-5 cursor-pointer transition-shadow"
    >
      <Link href={`/case/${c.id}`} className="block">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] tracking-tight truncate">{c.topDiagnosis}</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {new Date(c.timestamp).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <ConfidenceBadge value={c.confidence} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {c.modalities.map((m) => (
            <span key={m} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[oklch(0.97_0_0)] border border-black/[0.06] text-muted-foreground">
              {MODALITY_LABEL[m] ?? m}
            </span>
          ))}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {c.hpoCount} HPO terms
          </span>
        </div>
      </Link>
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
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <h3 className="text-[17px] font-semibold mb-2">{t("noCases")}</h3>
      <p className="text-[14px] text-muted-foreground max-w-xs mb-8">
        Start your first case by uploading patient data across one or more clinical modalities.
      </p>
      <Link href="/intake">
        <Button className="rounded-full bg-foreground text-background px-6 h-10">
          {t("startFirst")}
        </Button>
      </Link>
    </motion.div>
  );
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const [cases, setCases] = useState<CaseSummary[]>(() => getCaseSummaries());
  const [loaded] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("lumina_case"));
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("lumina_cases");
    setCases([]);
    setConfirmClear(false);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex items-center justify-between mb-8 pt-4"
        >
          <div>
            <h1 className="serif text-[28px] tracking-tight">{t("title")}</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              {cases.length > 0 ? `${cases.length} case${cases.length !== 1 ? "s" : ""} total` : t("subtitle")}
            </p>
          </div>
          <Link href="/intake">
            <Button className="rounded-full bg-foreground text-background h-9 px-5 text-[13px]">
              {t("newCase")}
            </Button>
          </Link>
        </motion.div>

        {/* Stats row */}
        {cases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease, delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {[
              { label: t("totalCases"), value: cases.length.toString() },
              { label: t("avgConfidence"), value: `${Math.round(cases.reduce((s, c) => s + c.confidence, 0) / cases.length)}%` },
              { label: t("hpoAvg"), value: Math.round(cases.reduce((s, c) => s + c.hpoCount, 0) / cases.length).toString() },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.4 }}
                className="bg-white rounded-xl border border-black/[0.06] px-4 py-3"
              >
                <div className="text-[22px] font-bold tracking-tight">{stat.value}</div>
                <div className="text-[12px] text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Case list */}
        {loaded ? (
          <AnimatePresence>
            {cases.length > 0 ? (
              <div className="grid gap-3">
                {cases.map((c, i) => (
                  <CaseCard key={c.id} c={c} index={i} />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </AnimatePresence>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-black/[0.06] p-5 h-24 shimmer" />
            ))}
          </div>
        )}

        {/* Clear all cases */}
        {loaded && cases.length > 0 && (
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
                  <span className="text-[13px] text-muted-foreground">Delete all {cases.length} cases?</span>
                  <button
                    onClick={handleClearAll}
                    className="text-[13px] font-medium text-red-500 hover:text-red-600 transition-colors"
                  >
                    Yes, delete all
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
