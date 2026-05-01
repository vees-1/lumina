"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { getCaseById, streamLetter } from "@/lib/api";
import type { CaseData } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function renderInline(text: string): React.ReactNode {
  // Replace **bold** with <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function formatLetter(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings: #, ##, ###
    if (/^#{1,3}\s/.test(line)) {
      const content = line.replace(/^#{1,3}\s+/, "");
      nodes.push(
        <h3
          key={i}
          className="font-semibold text-[15px] mt-5 mb-2 text-foreground"
        >
          {renderInline(content)}
        </h3>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      nodes.push(<hr key={i} className="my-4 border-black/10" />);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-3" />);
      i++;
      continue;
    }

    // List items — collect consecutive list lines into a <ul>
    if (/^[-*]\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        const content = lines[i].replace(/^[-*]\s+/, "");
        listItems.push(
          <li
            key={i}
            className="ml-4 text-[14px] leading-relaxed text-foreground/90 list-disc"
          >
            {renderInline(content)}
          </li>
        );
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2">
          {listItems}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p
        key={i}
        className="text-[14px] leading-relaxed text-foreground/90 mb-1"
      >
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

export default function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("letter");
  const locale = useLocale();
  const { id } = use(params);
  const [caseData] = useState<CaseData | null>(() => getCaseById(id));
  const [letter, setLetter] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!caseData || hasStarted.current) return;
    hasStarted.current = true;
    (async () => {
      setStreaming(true);
      try {
        for await (const chunk of streamLetter(caseData, locale)) {
          setLetter((prev) => prev + chunk);
        }
        setDone(true);
      } catch {
        setError("Letter generation failed — is the API running?");
      } finally {
        setStreaming(false);
      }
    })();
  }, [caseData, locale]);

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
  };

  const handleDownload = () => {
    const clean = letter
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/^[-*]\s+/gm, "• ")
      .trim();
    const blob = new Blob([clean], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referral_letter_${id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    const clean = letter
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/\*\*/g, "")
      .replace(/^[-*]\s+/gm, "• ");
    win.document.write(
      `<html><head><title>Referral Letter</title><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;line-height:1.7;font-size:14px}@media print{body{margin:20px}}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit">${clean.replace(/</g, "&lt;")}</pre></body></html>`
    );
    win.document.close();
    win.print();
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
            <Link
              href={`/case/${id}`}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-1 block"
            >
              {t("backToCase")}
            </Link>
            <h1 className="serif text-[26px] tracking-tight">{t("title")}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{topDx}</p>
          </div>
          {done && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing((e) => !e)}
                className="text-[13px] h-8 rounded-full"
              >
                {editing ? t("doneEditing") : t("edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-[13px] h-8 rounded-full"
              >
                {t("copy")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-[13px] h-8 rounded-full"
              >
                {t("print")}
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
            <div
              className={`w-2 h-2 rounded-full ${
                streaming
                  ? "bg-[oklch(0.52_0.21_255)] animate-pulse"
                  : done
                  ? "bg-[oklch(0.52_0.19_160)]"
                  : "bg-[oklch(0.75_0_0)]"
              }`}
            />
            <span className="text-[12px] text-muted-foreground">
              {streaming ? t("generating") : done ? t("complete") : t("waiting")}
            </span>
          </div>

          {error ? (
            <div className="p-6 text-[13px] text-red-500">{error}</div>
          ) : (
            <div className="p-8 min-h-[400px]">
              {editing ? (
                <textarea
                  value={letter}
                  onChange={(e) => setLetter(e.target.value)}
                  className="w-full min-h-[500px] p-8 text-[14px] leading-relaxed font-serif resize-none outline-none bg-transparent"
                />
              ) : letter ? (
                formatLetter(letter)
              ) : (
                !streaming && (
                  <p className="text-[14px] text-muted-foreground">
                    {t("placeholder")}
                  </p>
                )
              )}
            </div>
          )}

          {/* Streaming cursor */}
          {streaming && letter && (
            <div className="px-8 pb-4">
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
