"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { getCaseById, streamLetter } from "@/lib/api";
import type { CaseData } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("letter");
  const { id } = use(params);
  const [caseData] = useState<CaseData | null>(() => getCaseById(id));
  const [letter, setLetter] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!caseData || hasStarted.current) return;
    hasStarted.current = true;
    (async () => {
      setStreaming(true);
      try {
        for await (const chunk of streamLetter(caseData)) {
          setLetter((prev) => prev + chunk);
        }
        setDone(true);
      } catch {
        setError("Letter generation failed — is the API running?");
      } finally {
        setStreaming(false);
      }
    })();
  }, [caseData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
  };

  const handleDownload = () => {
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumina_letter_${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topDx = caseData?.rankings?.[0]?.name ?? "Unknown";
  const wordCount = letter.split(/\s+/).filter(Boolean).length;

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
            <Link href={`/case/${id}`} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-1 block">
              {t("backToCase")}
            </Link>
            <h1 className="serif text-[26px] tracking-tight">{t("title")}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {topDx}
            </p>
          </div>
          {done && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-[13px] h-8 rounded-full"
              >
                {t("copy")}
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="text-[13px] h-8 rounded-full bg-foreground text-background"
              >
                {t("download")}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Letter body */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease, delay: 0.1 }}
          className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden"
        >
          {/* Status bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.06]">
            <div className={`w-2 h-2 rounded-full ${streaming ? "bg-[oklch(0.52_0.21_255)] animate-pulse" : done ? "bg-[oklch(0.52_0.19_160)]" : "bg-[oklch(0.75_0_0)]"}`} />
            <span className="text-[12px] text-muted-foreground">
              {streaming ? t("generating") : done ? t("complete") : t("waiting")}
            </span>
          </div>

          {error ? (
            <div className="p-6 text-[13px] text-red-500">{error}</div>
          ) : (
            <textarea
              ref={editorRef}
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              className="w-full min-h-[600px] p-6 text-[14px] leading-relaxed font-mono resize-none outline-none bg-white"
              placeholder={streaming ? "" : t("placeholder")}
              spellCheck
            />
          )}

          {/* Streaming cursor */}
          {streaming && letter && (
            <div className="px-6 pb-4">
              <span className="inline-block w-2 h-4 bg-[oklch(0.52_0.21_255)] animate-pulse rounded-sm" />
            </div>
          )}
        </motion.div>

        {/* Word count */}
        {letter && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[12px] text-muted-foreground mt-3 text-right"
          >
            {t("words", { count: wordCount })}
          </motion.p>
        )}
      </main>
    </div>
  );
}
