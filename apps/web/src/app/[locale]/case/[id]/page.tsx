"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { getCaseById, getAgentSuggestion, streamLetter } from "@/lib/api";
import type { AgentSuggestion } from "@/lib/api";
import type { CaseData, RankResult } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const MODALITY_LABEL: Record<string, string> = {
  notes: "Clinical Notes", photo: "Clinical Photo", lab: "Lab Report", vcf: "Genomic",
};

const MODALITY_NEXT_LABEL: Record<string, string> = {
  notes: "clinical notes", photo: "a clinical photo", lab: "a lab report", vcf: "a genomic VCF",
};

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ value, color, delay }: { value: number; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="h-1.5 bg-[oklch(0.95_0_0)] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={inView ? { width: `${value}%` } : { width: 0 }}
        transition={{ duration: 1.0, ease, delay }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ── Rank card ─────────────────────────────────────────────────────────────────

function RankCard({ result, rank, delay }: { result: RankResult; rank: number; delay: number }) {
  const colors = [
    "oklch(0.52 0.21 255)",
    "oklch(0.65 0.18 200)",
    "oklch(0.60 0.20 285)",
    "oklch(0.52 0.19 160)",
    "oklch(0.58 0.16 50)",
  ];
  const color = colors[rank - 1] ?? colors[4];
  const isTop = rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease, delay }}
      className={`relative bg-white rounded-2xl border p-5 ${isTop ? "border-[oklch(0.52_0.21_255/0.3)] shadow-[0_4px_24px_oklch(0.52_0.21_255/0.1)]" : "border-black/[0.06]"}`}
    >
      {isTop && (
        <div className="absolute -top-2.5 left-4">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: color }}>
            Top match
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[15px]"
          style={{ background: color }}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-[15px] tracking-tight leading-tight">{result.name}</h3>
            <span className="flex-shrink-0 text-[13px] font-bold" style={{ color }}>
              {result.confidence.toFixed(0)}%
            </span>
          </div>
          <Link href={`/disease/${result.orpha_code}`} className="text-[12px] text-muted-foreground hover:text-[oklch(0.52_0.21_255)] transition-colors mb-3 inline-block">
            ORPHA:{result.orpha_code} ↗
          </Link>
          <ConfidenceBar value={result.confidence} color={color} delay={delay + 0.2} />
          {result.contributing_terms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {result.contributing_terms.slice(0, 5).map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border border-black/[0.08] bg-[oklch(0.975_0_0)] text-muted-foreground font-mono">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Agent suggestion banner ───────────────────────────────────────────────────

function AgentBanner({
  suggestion,
  onDismiss,
}: {
  suggestion: AgentSuggestion;
  onDismiss: () => void;
}) {
  const nextLabel = MODALITY_NEXT_LABEL[suggestion.modality] ?? suggestion.modality;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease }}
      className="rounded-2xl border border-[oklch(0.52_0.21_255/0.25)] bg-[oklch(0.52_0.21_255/0.05)] p-4 flex items-start gap-3 mb-6"
    >
      <div className="w-8 h-8 rounded-xl bg-[oklch(0.52_0.21_255/0.12)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-[oklch(0.52_0.21_255)]" fill="none" viewBox="0 0 16 16">
          <path d="M8 2l1.1 3.4H13l-2.9 2.1 1.1 3.4L8 8.8 4.8 10.9l1.1-3.4L3 5.4h3.9L8 2z"
            stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[oklch(0.38_0.21_255)] mb-0.5">
          AI suggests: add {nextLabel}
        </p>
        <p className="text-[12px] text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>
        <div className="flex items-center gap-2 mt-3">
          <Link href="/intake">
            <button className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[oklch(0.52_0.21_255)] text-white hover:bg-[oklch(0.46_0.21_255)] transition-colors">
              Add now
            </button>
          </Link>
          <button
            onClick={onDismiss}
            className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-black/[0.05] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Explainability panel ──────────────────────────────────────────────────────

function ExplainabilityPanel({ result, caseData }: { result: RankResult; caseData: CaseData }) {
  const hpoMap = new Map(caseData.hpoTerms.map((t) => [t.hpo_id, t]));
  const terms = result.contributing_terms.slice(0, 5);

  const modalityColor: Record<string, string> = {
    notes: "oklch(0.52 0.21 255)",
    photo: "oklch(0.55 0.18 200)",
    lab: "oklch(0.52 0.20 285)",
    vcf: "oklch(0.46 0.19 160)",
  };
  const modalityBg: Record<string, string> = {
    notes: "oklch(0.52 0.21 255 / 0.1)",
    photo: "oklch(0.55 0.18 200 / 0.1)",
    lab: "oklch(0.52 0.20 285 / 0.1)",
    vcf: "oklch(0.46 0.19 160 / 0.1)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: 0.35 }}
      className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden"
    >
      <div className="px-5 py-3 border-b border-black/[0.06]">
        <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
          Why {result.name}?
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          Top discriminating phenotypes for this diagnosis
        </p>
      </div>
      <div className="divide-y divide-black/[0.04]">
        {terms.map((hpoId, i) => {
          const term = hpoMap.get(hpoId);
          const src = term?.source ?? "unknown";
          const color = modalityColor[src] ?? "oklch(0.46 0 0)";
          const bg = modalityBg[src] ?? "oklch(0.46 0 0 / 0.08)";
          return (
            <motion.div
              key={hpoId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06, duration: 0.3 }}
              className="flex items-center gap-3 px-5 py-3"
            >
              <span className="text-[12px] font-mono text-muted-foreground w-24 flex-shrink-0">{hpoId}</span>
              <div className="flex-1 min-w-0">
                <div className="h-1 bg-[oklch(0.95_0_0)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(term?.confidence ?? 0.5) * 100}%` }}
                    transition={{ duration: 0.8, ease, delay: 0.5 + i * 0.06 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
              {src !== "unknown" && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: bg, color }}
                >
                  {MODALITY_LABEL[src] ?? src}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      {terms.length === 0 && (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">No contributing terms available.</p>
      )}
    </motion.div>
  );
}

// ── PubMed citations ──────────────────────────────────────────────────────────

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  year: string;
}

function PubMedCitations({ diseaseName }: { diseaseName: string }) {
  const [articles, setArticles] = useState<PubMedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchCitations() {
      try {
        const query = encodeURIComponent(`"${diseaseName}"[Title/Abstract] rare disease`);
        const searchRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=3&retmode=json&sort=relevance`
        );
        const searchData = await searchRes.json();
        const ids: string[] = searchData.esearchresult?.idlist ?? [];
        if (!ids.length || cancelled) { setLoading(false); return; }

        const summaryRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
        );
        const summaryData = await summaryRes.json();
        if (cancelled) return;

        const parsed: PubMedArticle[] = ids.map((id) => {
          const doc = summaryData.result?.[id];
          const authors = (doc?.authors ?? []).slice(0, 2).map((a: { name: string }) => a.name).join(", ");
          return {
            pmid: id,
            title: doc?.title ?? "Untitled",
            authors: authors + ((doc?.authors?.length ?? 0) > 2 ? " et al." : ""),
            year: doc?.pubdate?.slice(0, 4) ?? "",
          };
        });
        setArticles(parsed);
      } catch {
        // PubMed unavailable — silently skip
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCitations();
    return () => { cancelled = true; };
  }, [diseaseName]);

  if (!loading && articles.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease, delay: 0.35 }}
      className="bg-white rounded-2xl border border-black/[0.06] p-4"
    >
      <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        PubMed References
      </h3>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg shimmer" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((a, i) => (
            <motion.a
              key={a.pmid}
              href={`https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="block group"
            >
              <p className="text-[12px] font-medium leading-snug group-hover:text-[oklch(0.52_0.21_255)] transition-colors line-clamp-2">
                {a.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {a.authors}{a.year ? ` · ${a.year}` : ""} · PMID {a.pmid}
              </p>
            </motion.a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Letter view ───────────────────────────────────────────────────────────────

function LetterView({ letter, streaming }: { letter: string; streaming: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [letter]);

  return (
    <div className="relative bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06]">
        <h3 className="text-[14px] font-semibold">Clinical Referral Letter</h3>
        {streaming && (
          <span className="flex items-center gap-1.5 text-[12px] text-[oklch(0.52_0.21_255)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.52_0.21_255)] animate-pulse" />
            Generating…
          </span>
        )}
        {!streaming && letter && (
          <button
            onClick={() => { navigator.clipboard.writeText(letter); toast.success("Copied to clipboard"); }}
            className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
              <rect x="2" y="5" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M5 5V3.5A1.5 1.5 0 016.5 2h6A1.5 1.5 0 0114 3.5v9A1.5 1.5 0 0112.5 14H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Copy
          </button>
        )}
      </div>
      <div className="p-6 max-h-[500px] overflow-y-auto">
        <div className="prose prose-sm max-w-none text-[14px] leading-relaxed text-foreground whitespace-pre-wrap font-sans">
          {letter}
          {streaming && <span className="cursor-blink" />}
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("case");
  const { id } = use(params);
  const [caseData] = useState<CaseData | null>(() => getCaseById(id));
  const [letter, setLetter] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [letterStarted, setLetterStarted] = useState(false);
  const [agentSuggestion, setAgentSuggestion] = useState<AgentSuggestion | null>(null);
  const [agentDismissed, setAgentDismissed] = useState(false);

  useEffect(() => {
    if (!caseData) return;
    const topConf = caseData.rankings[0]?.confidence ?? 100;
    const allModalities = ["notes", "photo", "lab", "vcf"];
    const unused = allModalities.filter((m) => !caseData.modalities.includes(m));
    if (topConf < 85 && unused.length > 0) {
      getAgentSuggestion(caseData.rankings.slice(0, 5), caseData.modalities, 0)
        .then((s) => { if (s.modality) setAgentSuggestion(s); })
        .catch(() => {});
    }
  }, [caseData]);

  const handleGenerateLetter = async () => {
    if (!caseData) return;
    setLetterStarted(true);
    setLetter("");
    setStreaming(true);
    try {
      for await (const chunk of streamLetter(caseData)) {
        setLetter((prev) => prev + chunk);
      }
    } catch {
      toast.error("Letter generation failed");
    } finally {
      setStreaming(false);
    }
  };

  const handleExportFHIR = async (data: CaseData, caseId: string) => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    try {
      const res = await fetch(`${API}/fhir/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          diagnoses: data.rankings.slice(0, 5).map((r) => ({
            orpha_code: r.orpha_code,
            name: r.name,
            confidence: r.confidence,
            contributing_terms: r.contributing_terms,
          })),
          hpo_terms: data.hpoTerms.map((t) => ({
            hpo_id: t.hpo_id,
            label: t.hpo_id,
            confidence: t.confidence,
          })),
        }),
      });
      if (!res.ok) throw new Error("FHIR export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `case_${caseId}_fhir.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("FHIR bundle downloaded");
    } catch {
      toast.error("FHIR export failed");
    }
  };

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[oklch(0.975_0_0)]">
        <DashboardNav />
        <main className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="py-16"
          >
            <h2 className="text-[20px] font-semibold mb-2">Case not found</h2>
            <p className="text-muted-foreground text-[14px] mb-6">This case may have expired from storage.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full">Back to dashboard</Button>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  const topRank = caseData.rankings[0];
  const topColor = "oklch(0.52 0.21 255)";

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="pt-6 mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Cases
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-[13px] text-muted-foreground font-mono">{id.slice(0, 8)}…</span>
          </div>

          {topRank ? (
            <>
              <h1 className="serif text-[28px] tracking-tight mb-1">{topRank.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="text-[13px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: `${topColor}15`, color: topColor }}
                >
                  {topRank.confidence.toFixed(0)}% confidence
                </span>
                <span className="text-[13px] text-muted-foreground">ORPHA:{topRank.orpha_code}</span>
                {caseData.modalities.map((m) => (
                  <span key={m} className="text-[12px] px-2.5 py-0.5 rounded-full bg-white border border-black/[0.08] text-muted-foreground">
                    {MODALITY_LABEL[m] ?? m}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <h1 className="serif text-[28px] tracking-tight">Case {id.slice(0, 8)}</h1>
          )}
        </motion.div>

        {/* Agent suggestion banner */}
        <AnimatePresence>
          {agentSuggestion && !agentDismissed && (
            <AgentBanner
              suggestion={agentSuggestion}
              onDismiss={() => setAgentDismissed(true)}
            />
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main column */}
          <div className="space-y-6">
            {/* Disease rankings */}
            <section>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3"
              >
                Differential Diagnosis
              </motion.h2>
              <div className="space-y-3">
                {caseData.rankings.slice(0, 5).map((r, i) => (
                  <RankCard key={r.orpha_code} result={r} rank={i + 1} delay={i * 0.08} />
                ))}
              </div>
            </section>

            {/* Explainability — why the top diagnosis? */}
            {topRank && topRank.contributing_terms.length > 0 && (
              <section>
                <ExplainabilityPanel result={topRank} caseData={caseData} />
              </section>
            )}

            {/* Letter */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Clinical Letter
                </h2>
                {!letterStarted && (
                  <Button
                    onClick={handleGenerateLetter}
                    disabled={streaming}
                    className="rounded-full bg-foreground text-background h-8 px-4 text-[13px]"
                  >
                    {t("generateLetter")}
                  </Button>
                )}
              </div>
              {letterStarted ? (
                <LetterView letter={letter} streaming={streaming} />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl border border-dashed border-black/10 p-10 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[oklch(0.97_0_0)] flex items-center justify-center mx-auto mb-3 float">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                      <path d="M9 12h6M9 16h4M7 8h10M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    Generate a specialist referral letter with Claude
                  </p>
                </motion.div>
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* HPO terms */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.15 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-4"
            >
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                HPO Phenotypes ({caseData.hpoTerms.length})
              </h3>
              <div className="flex flex-wrap gap-1.5 max-h-[260px] overflow-y-auto">
                {caseData.hpoTerms
                  .sort((a, b) => b.confidence - a.confidence)
                  .map((t, i) => (
                    <motion.span
                      key={t.hpo_id}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.025, duration: 0.2 }}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-black/[0.08] bg-[oklch(0.975_0_0)] text-muted-foreground font-mono hover:border-[oklch(0.52_0.21_255/0.3)] hover:bg-[oklch(0.52_0.21_255/0.04)] transition-colors"
                      title={`${t.source} (${(t.confidence * 100).toFixed(0)}%)`}
                    >
                      {t.hpo_id}
                    </motion.span>
                  ))}
              </div>
            </motion.div>

            {/* Evidence summary */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.2 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-4"
            >
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Evidence</h3>
              <div className="space-y-2">
                {[
                  { label: "HPO terms extracted", value: caseData.hpoTerms.length.toString() },
                  { label: "Modalities used", value: caseData.modalities.length.toString() },
                  { label: "Diseases ranked", value: caseData.rankings.length.toString() },
                  { label: "Top confidence", value: topRank ? `${topRank.confidence.toFixed(1)}%` : "—" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-[12px] text-muted-foreground">{row.label}</span>
                    <span className="text-[13px] font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* PubMed citations */}
            {topRank && <PubMedCitations diseaseName={topRank.name} />}

            {/* Patient context */}
            {(caseData.patientContext?.age || caseData.patientContext?.sex) && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease, delay: 0.25 }}
                className="bg-white rounded-2xl border border-black/[0.06] p-4"
              >
                <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Patient</h3>
                <div className="space-y-2">
                  {caseData.patientContext?.age && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-muted-foreground">Age</span>
                      <span className="text-[13px] font-medium">{caseData.patientContext.age}</span>
                    </div>
                  )}
                  {caseData.patientContext?.sex && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-muted-foreground">Sex</span>
                      <span className="text-[13px] font-medium capitalize">{caseData.patientContext.sex}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.3 }}
              className="space-y-2"
            >
              <Button
                variant="outline"
                className="w-full rounded-xl h-9 text-[13px] border-black/10"
                onClick={() => handleExportFHIR(caseData, id)}
              >
                {t("exportFhir")}
              </Button>
              <Link href="/intake" className="block">
                <Button variant="outline" className="w-full rounded-xl h-9 text-[13px] border-black/10">
                  New case
                </Button>
              </Link>
              <Link href="/dashboard" className="block">
                <Button variant="ghost" className="w-full rounded-xl h-9 text-[13px]">
                  All cases
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
