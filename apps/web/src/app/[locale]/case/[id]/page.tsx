"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslations, useLocale, useMessages } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { localizeHpoLabel, type HpoLabelMessages } from "@/lib/hpo";
import { getCaseById, getAgentSuggestion, streamLetter, updateCaseInStorage } from "@/lib/api";
import type { AgentSuggestion } from "@/lib/api";
import type { CaseData, HPOTerm, InputSnapshot, RankResult, RankTermContext } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const CONFIDENCE_CAPS: Record<number, number> = { 1: 40, 2: 55, 3: 65, 4: 80 };
const CLOSE_CONFIDENCE_GAP = 10;
const RANK_COLOR = "oklch(0.60 0.20 285)";

function isAbsentTerm(term: Pick<HPOTerm, "assertion" | "confidence">) {
  return term.assertion === "absent" || term.confidence < 0;
}

function formatHpoLabel(
  term: Pick<RankTermContext, "hpo_id" | "label" | "matched_hpo_id" | "matched_label">,
  messages: HpoLabelMessages,
) {
  const id = term.matched_hpo_id ?? term.hpo_id;
  const fallback = term.matched_label?.trim() || term.label?.trim();
  const label = localizeHpoLabel(id, fallback, messages);
  return label ? `${label} (${id})` : id;
}

function getTermDetails(
  result: RankResult,
  kind: "contributing" | "missing" | "distinguishing",
): RankTermContext[] {
  const detailMap = {
    contributing: result.contributing_term_details,
    missing: result.missing_term_details,
    distinguishing: result.distinguishing_term_details,
  } as const;
  const idMap = {
    contributing: result.contributing_terms,
    missing: result.missing_terms,
    distinguishing: result.distinguishing_terms,
  } as const;

  const details = detailMap[kind];
  if (details?.length) return details;
  return (idMap[kind] ?? []).map((hpoId) => ({ hpo_id: hpoId, label: "" }));
}

function ConfidenceTooltip({ confidence, modalities, children }: { confidence: number; modalities: number; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const cap = CONFIDENCE_CAPS[modalities] ?? 80;
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible(!visible)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-0 mb-2 w-64 bg-foreground text-background text-[12px] leading-relaxed rounded-xl px-3 py-2.5 shadow-lg z-50 pointer-events-auto sm:pointer-events-none">
          <span className="font-semibold">{confidence.toFixed(0)}%</span> is a relative phenotypic overlap score, not a probability. The ceiling for {modalities} modality{modalities !== 1 ? " inputs" : ""} is {cap}%. Adding more modalities raises the ceiling.
          <span className="absolute top-full left-4 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </span>
  );
}


function HPOChip({ term }: { term: HPOTerm }) {
  const t = useTranslations("case");
  const messages = useMessages() as HpoLabelMessages;
  const label = localizeHpoLabel(term.hpo_id, term.label, messages);

  return (
    <motion.span
      key={`${term.hpo_id}-${term.source}-${term.assertion ?? "present"}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group text-[11px] px-2 py-0.5 rounded-full border border-black/[0.08] bg-[oklch(0.975_0_0)] text-muted-foreground cursor-default hover:border-[oklch(0.52_0.21_255/0.3)] hover:bg-[oklch(0.52_0.21_255/0.04)] transition-colors"
    >
      <span className="font-medium">{label}</span>{" "}
      <span className="font-mono text-[10px] opacity-75">{term.hpo_id}</span>
      {term.source && (
        <span className="absolute bottom-full left-1/2 mb-2 w-60 max-w-[calc(100vw-2rem)] -translate-x-1/2 bg-foreground text-background text-[11px] leading-relaxed rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-[100] pointer-events-none whitespace-normal font-sans shadow-xl">
          <span className="font-semibold">{t("fromLabel")}</span> {term.source}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
        </span>
      )}
    </motion.span>
  );
}

function RankTermChip({
  term,
  tone = "default",
}: {
  term: Pick<RankTermContext, "hpo_id" | "label" | "matched_hpo_id" | "matched_label">;
  tone?: "default" | "missing" | "distinguishing";
}) {
  const messages = useMessages() as HpoLabelMessages;
  const toneClasses = {
    default: "border border-black/[0.08] bg-[oklch(0.975_0_0)] text-muted-foreground",
    missing: "border border-dashed border-black/[0.12] text-muted-foreground/80",
    distinguishing: "bg-[oklch(0.52_0.21_255/0.06)] border border-[oklch(0.52_0.21_255/0.2)] text-[oklch(0.38_0.21_255)]",
  } as const;

  const id = tone === "default" ? term.matched_hpo_id ?? term.hpo_id : term.hpo_id;
  const fallbackLabel = tone === "default" ? term.matched_label?.trim() || term.label?.trim() : term.label?.trim();
  const label = localizeHpoLabel(id, fallbackLabel, messages);

  return (
    <span className={`text-[11px] px-2 py-1 rounded-lg ${toneClasses[tone]}`}>
      {label ? (
        <>
          <span className="font-medium">{label}</span>{" "}
          <span className="font-mono text-[10px] opacity-75">{id}</span>
        </>
      ) : (
        <span className="font-mono">{id}</span>
      )}
    </span>
  );
}

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
  const t = useTranslations("case");
  const color = RANK_COLOR;
  const isTop = rank === 1;
  const contributingTerms = getTermDetails(result, "contributing").slice(0, 5);
  const missingTerms = getTermDetails(result, "missing").slice(0, 4);
  const distinguishingTerms = getTermDetails(result, "distinguishing").slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease, delay }}
      className={`relative bg-white rounded-2xl border p-5 ${isTop ? "border-[oklch(0.60_0.20_285/0.3)] shadow-[0_4px_24px_oklch(0.60_0.20_285/0.1)]" : "border-black/[0.06]"}`}
    >
      {isTop && (
        <div className="absolute -top-2.5 left-4">
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: color }}>
            {t("topMatch")}
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
          {contributingTerms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {contributingTerms.map((term) => (
                <RankTermChip key={`${result.orpha_code}-contrib-${term.hpo_id}`} term={term} />
              ))}
            </div>
          )}
          {missingTerms.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/[0.04]">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                {t("missingFindings")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingTerms.map((term) => (
                  <RankTermChip key={`${result.orpha_code}-missing-${term.hpo_id}`} term={term} tone="missing" />
                ))}
              </div>
            </div>
          )}
          {distinguishingTerms.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-[oklch(0.52_0.21_255/0.7)] uppercase tracking-wider mb-1.5">
                {t("distinguishingFeatures")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {distinguishingTerms.map((term) => (
                  <RankTermChip key={`${result.orpha_code}-dist-${term.hpo_id}`} term={term} tone="distinguishing" />
                ))}
              </div>
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
  caseId,
}: {
  suggestion: AgentSuggestion;
  onDismiss: () => void;
  caseId: string;
}) {
  const t = useTranslations("case");
  const modalityNextLabel: Record<string, string> = {
    notes: t("modalityNextNotes"),
    photo: t("modalityNextPhoto"),
    lab: t("modalityNextLab"),
    vcf: t("modalityNextVcf"),
  };
  const nextLabel = modalityNextLabel[suggestion.modality] ?? suggestion.modality;
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
          {t("aiSuggests", { modality: nextLabel })}
        </p>
        <p className="text-[12px] text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>
        <div className="flex items-center gap-2 mt-3">
          <Link href={`/intake?addTo=${caseId}`}>
            <button className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[oklch(0.52_0.21_255)] text-white hover:bg-[oklch(0.46_0.21_255)] transition-colors">
              {t("addNow")}
            </button>
          </Link>
          <button
            onClick={onDismiss}
            className="text-[12px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-black/[0.05] transition-colors"
          >
            {t("dismiss")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Explainability panel ──────────────────────────────────────────────────────

function ExplainabilityPanel({ result, caseData }: { result: RankResult; caseData: CaseData }) {
  const t = useTranslations("case");
  const messages = useMessages() as HpoLabelMessages;
  const hpoMap = new Map(caseData.hpoTerms.map((t) => [t.hpo_id, t]));
  const modalityLabel: Record<string, string> = {
    notes: t("modalityNotes"),
    photo: t("modalityPhoto"),
    lab: t("modalityLab"),
    vcf: t("modalityVcf"),
  };
  const terms = getTermDetails(result, "contributing").slice(0, 5);

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
          {t("whyThis")}
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {t("topDiscriminating")}
        </p>
      </div>
      <div className="divide-y divide-black/[0.04]">
        {terms.map((detail, i) => {
          const patientHpoId = detail.matched_hpo_id ?? detail.hpo_id;
          const term = hpoMap.get(patientHpoId);
          const src = term?.source_type ?? "unknown";
          const color = modalityColor[src] ?? "oklch(0.46 0 0)";
          const bg = modalityBg[src] ?? "oklch(0.46 0 0 / 0.08)";
          return (
            <motion.div
              key={`${result.orpha_code}-why-${patientHpoId}-${detail.hpo_id}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06, duration: 0.3 }}
              className="flex items-center gap-3 px-5 py-3"
            >
              <span className="text-[12px] text-muted-foreground w-56 flex-shrink-0 truncate">
                {formatHpoLabel(detail, messages)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="h-1 bg-[oklch(0.95_0_0)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.abs(term?.confidence ?? detail.patient_confidence ?? 0.5) * 100}%` }}
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
                  {modalityLabel[src] ?? src}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      {terms.length === 0 && (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">{t("noContributing")}</p>
      )}
    </motion.div>
  );
}

function CandidateComparisonPanel({ rankings }: { rankings: RankResult[] }) {
  const t = useTranslations("case");
  const messages = useMessages() as HpoLabelMessages;
  const [first, second] = rankings;

  if (!first || !second) return null;

  const gap = Math.abs(first.confidence - second.confidence);
  if (gap > CLOSE_CONFIDENCE_GAP) return null;

  const firstHighlights = getTermDetails(first, "distinguishing").slice(0, 3);
  const secondHighlights = getTermDetails(second, "distinguishing").slice(0, 3);
  const firstQuestions = (firstHighlights.length ? firstHighlights : getTermDetails(first, "missing")).slice(0, 2);
  const secondQuestions = (secondHighlights.length ? secondHighlights : getTermDetails(second, "missing")).slice(0, 2);
  const questions = [
    ...firstQuestions.map((term) => ({ disease: first.name, term })),
    ...secondQuestions.map((term) => ({ disease: second.name, term })),
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: 0.18 }}
      className="bg-white rounded-2xl border border-black/[0.06] p-5"
    >
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold">{t("compareTopCandidates")}</h2>
        <p className="text-[12px] text-muted-foreground mt-1">
          {t("compareTopCandidatesSub", { gap: gap.toFixed(0) })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[first, second].map((result, index) => {
          const highlights = getTermDetails(result, "distinguishing").slice(0, 3);
          const missing = getTermDetails(result, "missing").slice(0, 2);
          return (
            <div key={result.orpha_code} className="rounded-xl border border-black/[0.06] bg-[oklch(0.99_0_0)] p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    #{index + 1}
                  </p>
                  <h3 className="text-[14px] font-semibold leading-tight">{result.name}</h3>
                </div>
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {result.confidence.toFixed(0)}%
                </span>
              </div>

              {highlights.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-[oklch(0.52_0.21_255/0.7)] uppercase tracking-wider mb-1.5">
                    {t("distinguishingFeatures")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {highlights.map((term) => (
                      <RankTermChip key={`${result.orpha_code}-compare-dist-${term.hpo_id}`} term={term} tone="distinguishing" />
                    ))}
                  </div>
                </div>
              )}

              {missing.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                    {t("missingFindings")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missing.map((term) => (
                      <RankTermChip key={`${result.orpha_code}-compare-missing-${term.hpo_id}`} term={term} tone="missing" />
                    ))}
                  </div>
                </div>
              )}

              {highlights.length === 0 && missing.length === 0 && (
                <p className="text-[12px] text-muted-foreground">{t("noComparisonDetails")}</p>
              )}
            </div>
          );
        })}
      </div>

      {questions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/[0.06]">
          <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("nextClinicalQuestions")}
          </h3>
          <div className="space-y-2">
            {questions.map(({ disease, term }) => (
              <p key={`${disease}-${term.hpo_id}`} className="text-[12px] text-foreground leading-relaxed">
                {t("askAboutFinding", { feature: formatHpoLabel(term, messages), disease })}
              </p>
            ))}
          </div>
        </div>
      )}
    </motion.section>
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
  const t = useTranslations("case");
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
        {t("pubmedReferences")}
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

function LetterView({
  letter,
  streaming,
  onChangeLetter,
}: {
  letter: string;
  streaming: boolean;
  onChangeLetter: (value: string) => void;
}) {
  const t = useTranslations("case");
  const letterT = useTranslations("letter");
  const endRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const isEditing = editing && !streaming && Boolean(letter);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [letter]);

  return (
    <div className="relative bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06]">
        <h3 className="text-[14px] font-semibold">{t("clinicalReferralLetter")}</h3>
        {streaming && (
          <span className="flex items-center gap-1.5 text-[12px] text-[oklch(0.52_0.21_255)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.52_0.21_255)] animate-pulse" />
            {t("generating")}
          </span>
        )}
        {!streaming && letter && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing((current) => !current)}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {isEditing ? letterT("doneEditing") : letterT("edit")}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(letter);
                toast.success(t("copiedToClipboard"));
              }}
              className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                <rect x="2" y="5" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5 5V3.5A1.5 1.5 0 016.5 2h6A1.5 1.5 0 0114 3.5v9A1.5 1.5 0 0112.5 14H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {letterT("copy")}
            </button>
          </div>
        )}
      </div>
      <div className="p-6 max-h-[500px] overflow-y-auto">
        {isEditing ? (
          <textarea
            value={letter}
            onChange={(e) => onChangeLetter(e.target.value)}
            className="w-full min-h-[420px] rounded-xl border border-black/[0.06] bg-[oklch(0.99_0_0)] px-4 py-3 text-[14px] leading-relaxed font-serif resize-none outline-none"
          />
        ) : (
          <div className="prose prose-sm max-w-none text-[14px] leading-relaxed text-foreground whitespace-pre-wrap font-sans">
            {letter}
            {streaming && <span className="cursor-blink" />}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("case");
  const locale = useLocale();
  const { id } = use(params);
  const [caseData] = useState<CaseData | null>(() => getCaseById(id));
  const [letter, setLetter] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [letterStarted, setLetterStarted] = useState(false);
  const [agentSuggestion, setAgentSuggestion] = useState<AgentSuggestion | null>(null);
  const [agentDismissed, setAgentDismissed] = useState(false);
  const [letterDob, setLetterDob] = useState(() => caseData?.patientContext?.dateOfBirth ?? "");
  const [referringPhysicianName, setReferringPhysicianName] = useState(() => caseData?.patientContext?.referringPhysicianName ?? "");
  const [referringClinic, setReferringClinic] = useState(() => caseData?.patientContext?.referringClinic ?? "");
  const [recipientSpecialist, setRecipientSpecialist] = useState(() => caseData?.patientContext?.recipientSpecialist ?? "");
  const [recipientHospital, setRecipientHospital] = useState(() => caseData?.patientContext?.recipientHospital ?? "");
  const [letterUrgency, setLetterUrgency] = useState(() => caseData?.patientContext?.urgency ?? "routine");
  const [showLetterForm, setShowLetterForm] = useState(false);

  useEffect(() => {
    if (!caseData) return;
    const topConf = caseData.rankings[0]?.confidence ?? 100;
    const allModalities = ["notes", "photo", "lab", "vcf"];
    const unused = allModalities.filter((m) => !caseData.modalities.includes(m));
    if (topConf < 85 && unused.length > 0) {
      getAgentSuggestion(caseData.rankings.slice(0, 5), caseData.modalities, 0, locale)
        .then((s) => { if (s.modality) setAgentSuggestion(s); })
        .catch(() => {});
    }
  }, [caseData, locale]);

  const handleGenerateLetter = async () => {
    if (!caseData) return;
    const patientContext = {
      ...(caseData.patientContext ?? {}),
      ...(letterDob.trim() ? { dateOfBirth: letterDob.trim() } : {}),
      ...(referringPhysicianName.trim() ? { referringPhysicianName: referringPhysicianName.trim() } : {}),
      ...(referringClinic.trim() ? { referringClinic: referringClinic.trim() } : {}),
      ...(recipientSpecialist.trim() ? { recipientSpecialist: recipientSpecialist.trim() } : {}),
      ...(recipientHospital.trim() ? { recipientHospital: recipientHospital.trim() } : {}),
      urgency: letterUrgency,
    };
    const updatedCase = { ...caseData, patientContext };
    updateCaseInStorage(caseData.id, updatedCase);
    setLetterStarted(true);
    setLetter("");
    setStreaming(true);
    try {
      for await (const chunk of streamLetter(updatedCase, locale)) {
        setLetter((prev) => prev + chunk);
      }
    } catch {
      toast.error(t("letterGenerationFailed"));
    } finally {
      setStreaming(false);
    }
  };

  const handleExportFHIR = async (data: CaseData, caseId: string) => {
    const API = "/api";
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
      toast.success(t("fhirDownloaded"));
    } catch {
      toast.error(t("fhirExportFailed"));
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
            <h2 className="text-[20px] font-semibold mb-2">{t("notFound")}</h2>
            <p className="text-muted-foreground text-[14px] mb-6">{t("notFoundSub")}</p>
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-full">{t("backToDashboard")}</Button>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  const topRank = caseData.rankings[0];
  const presentTerms = caseData.hpoTerms
    .filter((term) => !isAbsentTerm(term))
    .sort((a, b) => Math.abs(b.confidence) - Math.abs(a.confidence));
  const absentTerms = caseData.hpoTerms
    .filter((term) => isAbsentTerm(term))
    .sort((a, b) => Math.abs(b.confidence) - Math.abs(a.confidence));
  const topColor = "oklch(0.52 0.21 255)";
  const analysisTimestamp = new Date(caseData.timestamp);
  const formattedAnalysisTimestamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(analysisTimestamp);
  const modalityLabel: Record<string, string> = {
    notes: t("modalityNotes"),
    photo: t("modalityPhoto"),
    lab: t("modalityLab"),
    vcf: t("modalityVcf"),
  };
  const originalNotes = caseData.notes?.trim();
  const inputHistory = caseData.inputHistory ?? [];
  const modalityMetadataSummary = inputHistory.reduce<Record<string, Set<string>>>((acc, snapshot) => {
    if (snapshot.photo?.fileName) {
      acc.photo ??= new Set();
      acc.photo.add(snapshot.photo.isFacial ? `${snapshot.photo.fileName} (${t("facialAnalysis")})` : snapshot.photo.fileName);
    }
    if (snapshot.lab?.fileName) {
      acc.lab ??= new Set();
      acc.lab.add(snapshot.lab.fileName);
    }
    if (snapshot.vcf?.fileName) {
      acc.vcf ??= new Set();
      acc.vcf.add(snapshot.vcf.fileName);
    }
    return acc;
  }, {});
  const formatSnapshotTime = (snapshot: InputSnapshot) => new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.timestamp));

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-16">
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
              {t("cases")}
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-[13px] text-muted-foreground font-mono">{id.slice(0, 8)}…</span>
          </div>

          {topRank ? (
            <>
              {caseData.patientContext?.patientName && (
                <p className="text-[13px] text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {caseData.patientContext.patientName}
                </p>
              )}
              <h1 className="serif text-[24px] sm:text-[28px] tracking-tight mb-2">{topRank.name}</h1>
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <ConfidenceTooltip confidence={topRank.confidence} modalities={caseData.modalities.length}>
                  <span
                    className="text-[12px] sm:text-[13px] font-semibold px-2.5 sm:px-3 py-1 rounded-full cursor-help whitespace-nowrap"
                    style={{ background: `${topColor}15`, color: topColor }}
                  >
                    {topRank.confidence.toFixed(0)}% {t("confidenceLabel")}
                  </span>
                </ConfidenceTooltip>
                <span className="text-[12px] sm:text-[13px] text-muted-foreground">ORPHA:{topRank.orpha_code}</span>
                <div className="flex flex-wrap gap-1.5">
                  {caseData.modalities.map((m) => (
                    <span key={m} className="text-[11px] sm:text-[12px] px-2 py-0.5 rounded-full bg-white border border-black/[0.08] text-muted-foreground whitespace-nowrap">
                      {modalityLabel[m] ?? m}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px] sm:text-[12px] text-muted-foreground">
                <time dateTime={analysisTimestamp.toISOString()}>{formattedAnalysisTimestamp}</time>
                <span className="text-muted-foreground/40">•</span>
                <span className="inline-flex items-center rounded-full border border-black/[0.06] bg-[oklch(0.97_0_0)] px-2 py-0.5 font-medium text-foreground">
                  {t("deterministicBadge")}
                </span>
              </div>
            </>
          ) : (
            <h1 className="serif text-[24px] sm:text-[28px] tracking-tight">{t("caseTitle", { id: id.slice(0, 8) })}</h1>
          )}
        </motion.div>


        {/* Agent suggestion banner */}
        <AnimatePresence>
          {agentSuggestion && !agentDismissed && (
            <AgentBanner
              suggestion={agentSuggestion}
              onDismiss={() => setAgentDismissed(true)}
              caseId={id}
            />
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-[1fr_300px] gap-6">
          {/* Main column */}
          <div className="space-y-6">
            {(originalNotes || inputHistory.length > 0) && (
              <section className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("originalInput")}
                </h2>
                {originalNotes && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      {t("originalNotes")}
                    </p>
                    <p className="text-[12px] text-foreground/85 whitespace-pre-wrap rounded-lg border border-black/[0.06] bg-[oklch(0.985_0_0)] px-3 py-2">
                      {originalNotes}
                    </p>
                  </div>
                )}
                {!!Object.keys(modalityMetadataSummary).length && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("inputMetadata")}
                    </p>
                    {Object.entries(modalityMetadataSummary).map(([modality, values]) => (
                      <div key={modality} className="flex items-start justify-between gap-3">
                        <span className="text-[12px] text-muted-foreground">
                          {modalityLabel[modality] ?? modality}
                        </span>
                        <span className="text-[12px] text-right text-foreground/80">
                          {Array.from(values).join(" · ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {inputHistory.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t("additions")}
                    </p>
                    {inputHistory.map((snapshot, idx) => (
                      <div key={`${snapshot.timestamp}-${idx}`} className="text-[12px] text-muted-foreground">
                        {formatSnapshotTime(snapshot)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Disease rankings */}
            <section>
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3"
              >
                {t("differentialDiagnosis")}
              </motion.h2>
              <div className="space-y-3">
                {caseData.rankings.slice(0, 10).map((r, i) => (
                  <RankCard key={r.orpha_code} result={r} rank={i + 1} delay={i * 0.08} />
                ))}
              </div>
            </section>

            <CandidateComparisonPanel rankings={caseData.rankings.slice(0, 2)} />

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
                  {t("clinicalLetter")}
                </h2>
              </div>
              {!letterStarted && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowLetterForm((s) => !s)}
                    className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors mb-2"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 12 12"
                    >
                      <path
                        d={showLetterForm ? "M2 4l4 4 4-4" : "M4 2l4 4-4 4"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t("customiseLetter")}
                  </button>
                  {showLetterForm && (
                    <div className="grid gap-3 p-3 rounded-xl bg-[oklch(0.975_0_0)] border border-black/[0.06] sm:grid-cols-2">
                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("patientDob")}</span>
                        <input
                          type="date"
                          value={letterDob}
                          onChange={(e) => setLetterDob(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-black/10 text-[12px] outline-none bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("referringPhysicianName")}</span>
                        <input
                          value={referringPhysicianName}
                          onChange={(e) => setReferringPhysicianName(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-black/10 text-[12px] outline-none bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("referringClinic")}</span>
                        <input
                          value={referringClinic}
                          onChange={(e) => setReferringClinic(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-black/10 text-[12px] outline-none bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("recipientSpecialist")}</span>
                        <input
                          value={recipientSpecialist}
                          onChange={(e) => setRecipientSpecialist(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-black/10 text-[12px] outline-none bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5 sm:col-span-2">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("recipientHospital")}</span>
                        <input
                          value={recipientHospital}
                          onChange={(e) => setRecipientHospital(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-black/10 text-[12px] outline-none bg-white"
                        />
                      </label>
                      <label className="grid gap-1.5 sm:col-span-2">
                        <span className="text-[11px] font-medium text-muted-foreground">{t("urgency")}</span>
                        <select
                          value={letterUrgency}
                          onChange={(e) => setLetterUrgency(e.target.value)}
                          className="w-full h-8 px-3 rounded-lg border border-black/10 text-[12px] outline-none bg-white"
                        >
                          <option value="routine">{t("urgencyRoutine")}</option>
                          <option value="urgent">{t("urgencyUrgent")}</option>
                          <option value="emergency">{t("urgencyEmergency")}</option>
                        </select>
                      </label>
                    </div>
                  )}
                </div>
              )}
              {!letterStarted && (
                <Button
                  onClick={handleGenerateLetter}
                  disabled={streaming}
                  className="rounded-full bg-foreground text-background h-8 px-4 text-[13px]"
                >
                  {t("generateLetter")}
                </Button>
              )}
              {letterStarted && (
                <LetterView letter={letter} streaming={streaming} onChangeLetter={setLetter} />
              )}
              {!letterStarted && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl border border-dashed border-black/10 p-10 text-center mt-3"
                >
                  <div className="w-12 h-12 rounded-full bg-[oklch(0.97_0_0)] flex items-center justify-center mx-auto mb-3 float">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                      <path d="M9 12h6M9 16h4M7 8h10M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    {t("generateWithClaude")}
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
                {t("hpoPhenotypes")} ({caseData.hpoTerms.length})
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                    {t("presentFindings")} ({presentTerms.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 overflow-visible">
                    {presentTerms.map((term, i) => (
                      <motion.div key={`${term.hpo_id}-present`} transition={{ delay: i * 0.025, duration: 0.2 }}>
                        <HPOChip term={term} />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {absentTerms.length > 0 && (
                  <div className="pt-3 border-t border-black/[0.06]">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                      {t("excludedFindings")} ({absentTerms.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 overflow-visible">
                      {absentTerms.map((term, i) => (
                        <motion.div key={`${term.hpo_id}-absent`} transition={{ delay: i * 0.025, duration: 0.2 }}>
                          <HPOChip term={term} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Evidence summary */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.2 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-4"
            >
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("evidence")}</h3>
              <div className="space-y-2">
                {[
                  { label: t("hpoExtracted"), value: caseData.hpoTerms.length.toString() },
                  { label: t("modalitiesUsed"), value: caseData.modalities.length.toString() },
                  { label: t("diseasesRanked"), value: caseData.rankings.length.toString() },
                  { label: t("topConfidence"), value: topRank ? `${topRank.confidence.toFixed(1)}%` : "—" },
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
                <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("patient")}</h3>
                <div className="space-y-2">
                  {caseData.patientContext?.age && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-muted-foreground">{t("age")}</span>
                      <span className="text-[13px] font-medium">{caseData.patientContext.age}</span>
                    </div>
                  )}
                  {caseData.patientContext?.sex && (
                    <div className="flex justify-between">
                      <span className="text-[12px] text-muted-foreground">{t("sex")}</span>
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
              {caseData.modalities.length < 4 && (
                <Link href={`/intake?addTo=${id}`} className="block">
                  <Button variant="outline" size="sm" className="w-full rounded-xl h-9 text-[13px] border-black/10 gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    {t("addData")}
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                className="w-full rounded-xl h-9 text-[13px] border-black/10"
                onClick={() => handleExportFHIR(caseData, id)}
              >
                {t("exportFhir")}
              </Button>
              <Link href="/intake" className="block">
                <Button variant="outline" className="w-full rounded-xl h-9 text-[13px] border-black/10">
                  {t("newCase")}
                </Button>
              </Link>
              <Link href="/dashboard" className="block">
                <Button variant="ghost" className="w-full rounded-xl h-9 text-[13px]">
                  {t("allCases")}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
