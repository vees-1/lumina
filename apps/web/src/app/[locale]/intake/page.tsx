"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { getCaseById, saveCaseToStorage, scoreCase, submitLab, submitNotes, submitPhoto, submitVcf, updateCaseInStorage } from "@/lib/api";
import type { HPOTerm } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Tab = "notes" | "photo" | "lab" | "vcf";

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  notes: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
      <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  photo: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 3l1-2h3l1 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lab: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
      <path d="M6 1v6L2 13a1 1 0 00.9 1.5h10.2A1 1 0 0014 13L10 7V1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 1h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6.5" cy="11" r="0.8" fill="currentColor" />
      <circle cx="9.5" cy="12" r="0.8" fill="currentColor" />
    </svg>
  ),
  vcf: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
      <path d="M8 1c0 0-2 2.5-2 5s2 5 2 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 1c0 0 2 2.5 2 5s-2 5-2 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3 5.5h10M3 10.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="14.5" r="1" fill="currentColor" />
    </svg>
  ),
};

const CONFIDENCE_CAPS: Record<number, number> = { 0: 0, 1: 40, 2: 55, 3: 65, 4: 80 };

function DropZone({
  accept, label, hint, file, onFile, onClear,
}: {
  accept: string; label: string; hint: string;
  file: File | null; onFile: (f: File) => void; onClear: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  if (file) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 p-4 rounded-xl border border-[oklch(0.52_0.21_255/0.3)] bg-[oklch(0.52_0.21_255/0.04)]"
      >
        <div className="w-10 h-10 rounded-lg bg-[oklch(0.52_0.21_255/0.1)] flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[oklch(0.52_0.21_255)]" fill="none" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 012-2h5l5 5v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate">{file.name}</p>
          <p className="text-[12px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-black/5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={dragging ? { scale: 1.01, borderColor: "oklch(0.52 0.21 255)" } : { scale: 1 }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed border-black/10 hover:border-black/20 hover:bg-black/[0.01] transition-all cursor-pointer group"
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="w-12 h-12 rounded-full bg-[oklch(0.97_0_0)] group-hover:bg-[oklch(0.94_0_0)] flex items-center justify-center transition-colors">
        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24">
          <path d="M12 16V8m0-4l4 4m-4-4L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
    </motion.div>
  );
}

function ProgressStep({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <motion.div
      animate={{ opacity: active || done ? 1 : 0.4 }}
      className="flex items-center gap-2"
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
        done ? "bg-[oklch(0.52_0.19_160)]" :
        active ? "bg-[oklch(0.52_0.21_255)] ring-4 ring-[oklch(0.52_0.21_255/0.2)]" :
        "bg-[oklch(0.92_0_0)]"
      }`}>
        {done ? (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
            <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : active ? (
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        ) : null}
      </div>
      <span className="text-[13px] font-medium">{label}</span>
    </motion.div>
  );
}

export default function IntakePage() {
  const t = useTranslations("intake");
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToId = searchParams.get("addTo");
  const existingCase = addToId ? getCaseById(addToId) : null;

  const usedModalities = addToId && existingCase ? existingCase.modalities : [];
  const firstUnused = (["notes", "photo", "lab", "vcf"] as Tab[]).find((m) => !usedModalities.includes(m)) ?? "notes";

  const [tab, setTab] = useState<Tab>(firstUnused);
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [isFacial, setIsFacial] = useState(false);
  const [lab, setLab] = useState<File | null>(null);
  const [vcf, setVcf] = useState<File | null>(null);
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState("");

  useEffect(() => {
    if (addToId && existingCase) {
      setPatientName(existingCase.patientContext?.patientName ?? "");
      setAge(existingCase.patientContext?.age ?? "");
      setSex(existingCase.patientContext?.sex ?? "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TABS: { id: Tab; label: string; hint: string }[] = [
    { id: "notes", label: t("tabNotesLabel"), hint: t("tabNotesHint") },
    { id: "photo", label: t("tabPhotoLabel"), hint: t("tabPhotoHint") },
    { id: "lab",   label: t("tabLabLabel"),   hint: t("tabLabHint")   },
    { id: "vcf",   label: t("tabVcfLabel"),   hint: t("tabVcfHint")   },
  ];

  const activeModalities = [!!notes.trim(), !!photo, !!lab, !!vcf].filter(Boolean).length;
  const hasAnyInput = activeModalities > 0;
  const confidenceCap = CONFIDENCE_CAPS[activeModalities];

  const addProgress = (msg: string) => {
    setActiveStep(msg);
    setProgress((p) => [...p, msg]);
  };

  const handleAnalyze = async () => {
    if (!hasAnyInput) {
      toast.error(t("errorNoInput"));
      return;
    }

    setAnalyzing(true);
    setProgress([]);
    const allTerms: HPOTerm[] = [];
    const modalities: string[] = [];

    const warmupToast = setTimeout(() => {
      toast.info(t("warmingUp"), { duration: 8000 });
    }, 6000);

    try {
      const calls: Promise<void>[] = [];

      if (notes.trim()) {
        calls.push(
          submitNotes(notes.trim()).then((terms) => {
            allTerms.push(...terms);
            modalities.push("notes");
            addProgress(t("progressNotes"));
          })
        );
      }
      if (photo) {
        calls.push(
          submitPhoto(photo, isFacial).then((terms) => {
            allTerms.push(...terms);
            modalities.push("photo");
            addProgress(t("progressPhoto"));
          })
        );
      }
      if (lab) {
        calls.push(
          submitLab(lab).then((terms) => {
            allTerms.push(...terms);
            modalities.push("lab");
            addProgress(t("progressLab"));
          })
        );
      }
      if (vcf) {
        calls.push(
          submitVcf(vcf).then((terms) => {
            allTerms.push(...terms);
            modalities.push("vcf");
            addProgress(t("progressVcf"));
          })
        );
      }

      await Promise.all(calls);
      clearTimeout(warmupToast);

      if (allTerms.length === 0) {
        toast.error(t("errorNoHpo"));
        setAnalyzing(false);
        return;
      }

      addProgress(t("progressScoring"));

      const termMap = new Map<string, HPOTerm>();

      // If merging into existing case, seed the map with existing HPO terms
      if (addToId && existingCase) {
        for (const term of existingCase.hpoTerms) {
          termMap.set(term.hpo_id, term);
        }
      }

      for (const term of allTerms) {
        const existing = termMap.get(term.hpo_id);
        if (!existing || term.confidence > existing.confidence) termMap.set(term.hpo_id, term);
      }
      const dedupedTerms = Array.from(termMap.values());

      // Merge modalities if in add mode
      const mergedModalities = addToId && existingCase
        ? [...new Set([...existingCase.modalities, ...modalities])]
        : modalities;

      const rankings = await scoreCase(dedupedTerms, 10, mergedModalities.length);
      addProgress(t("progressRanking"));

      if (addToId && existingCase) {
        updateCaseInStorage(addToId, {
          ...existingCase,
          timestamp: Date.now(),
          modalities: mergedModalities,
          hpoTerms: dedupedTerms,
          rankings,
          patientContext: { patientName: patientName || undefined, age: age || undefined, sex: sex || undefined },
        });
        router.push(`/case/${addToId}`);
      } else {
        const caseId = uuid();
        saveCaseToStorage({
          id: caseId,
          timestamp: Date.now(),
          notes: notes.trim() || undefined,
          modalities,
          hpoTerms: dedupedTerms,
          rankings,
          patientContext: { patientName: patientName || undefined, age: age || undefined, sex: sex || undefined },
        });
        router.push(`/case/${caseId}`);
      }
    } catch (err) {
      clearTimeout(warmupToast);
      console.error(err);
      toast.error(t("errorApiFailed"));
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-5xl mx-auto px-8 pt-20 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="pt-6 mb-8"
        >
          <h1 className="serif text-[30px] tracking-tight">{addToId && existingCase ? t("titleAdd") : t("title")}</h1>
          <p className="text-[14px] text-muted-foreground mt-1">{t("subtitle")}</p>
        </motion.div>

        {/* Add-mode banner */}
        {addToId && existingCase && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="bg-[oklch(0.52_0.21_255/0.06)] border border-[oklch(0.52_0.21_255/0.2)] rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
          >
            <svg className="w-4 h-4 text-[oklch(0.52_0.21_255)] flex-shrink-0" fill="none" viewBox="0 0 16 16">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-[13px] text-[oklch(0.52_0.21_255)]">{t("addingToCase")}</span>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-4">

            {/* Patient context */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.05 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-[oklch(0.97_0_0)] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 16 16">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="text-[14px] font-semibold">{t("patientContext")}</h2>
                <span className="text-[12px] text-muted-foreground font-normal">{t("optional")}</span>
              </div>

              {/* Patient name — full width */}
              <div className="mb-3">
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">{t("patientName")}</label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder={t("patientNamePlaceholder")}
                  className="w-full h-9 px-3 rounded-lg border border-black/10 text-[13px] outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all bg-white"
                />
              </div>

              {/* Age + Sex */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">{t("age")}</label>
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder={t("agePlaceholder")}
                    className="w-full h-9 px-3 rounded-lg border border-black/10 text-[13px] outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">{t("sex")}</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-black/10 text-[13px] outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all bg-white appearance-none"
                  >
                    <option value="">{t("sexUnknown")}</option>
                    <option value="male">{t("sexMale")}</option>
                    <option value="female">{t("sexFemale")}</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Modality tabs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.1 }}
              className={`bg-white rounded-2xl border overflow-hidden transition-all duration-500 ${
                analyzing
                  ? "border-[oklch(0.52_0.21_255/0.4)] shadow-[0_0_0_3px_oklch(0.52_0.21_255/0.08)]"
                  : "border-black/[0.06]"
              }`}
            >
              {/* Tab bar */}
              <div className="flex border-b border-black/[0.06] overflow-x-auto scrollbar-none">
                {TABS.map((tabItem) => {
                  const hasData =
                    tabItem.id === "notes" ? !!notes.trim() :
                    tabItem.id === "photo" ? !!photo :
                    tabItem.id === "lab" ? !!lab :
                    !!vcf;
                  return (
                    <button
                      key={tabItem.id}
                      onClick={() => setTab(tabItem.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium transition-all border-b-2 ${
                        tab === tabItem.id
                          ? "text-foreground border-foreground"
                          : "text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      {TAB_ICONS[tabItem.id]}
                      {tabItem.label}
                      {hasData && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.52_0.21_255)]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tab === "notes" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">{t("notesDesc")}</p>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={t("notesPlaceholder")}
                          rows={8}
                          className="w-full px-4 py-3 rounded-xl border border-black/10 text-[14px] leading-relaxed outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all resize-none font-mono text-muted-foreground placeholder:text-black/25"
                        />
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {`${notes.length} ${t("charCount")}`}
                        </p>
                      </div>
                    )}

                    {tab === "photo" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">{t("photoDesc")}</p>
                        <DropZone
                          accept="image/*"
                          label={t("photoDropLabel")}
                          hint={t("photoDropHint")}
                          file={photo}
                          onFile={setPhoto}
                          onClear={() => setPhoto(null)}
                        />
                        <label className="mt-3 flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isFacial}
                            onChange={(e) => setIsFacial(e.target.checked)}
                            className="w-4 h-4 rounded accent-[oklch(0.52_0.21_255)]"
                          />
                          <span className="text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">
                            {t("photoFacialToggle")}
                          </span>
                        </label>
                      </div>
                    )}

                    {tab === "lab" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">{t("labDesc")}</p>
                        <DropZone
                          accept="image/*,.pdf"
                          label={t("labDropLabel")}
                          hint={t("labDropHint")}
                          file={lab}
                          onFile={setLab}
                          onClear={() => setLab(null)}
                        />
                      </div>
                    )}

                    {tab === "vcf" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">{t("vcfDesc")}</p>
                        <DropZone
                          accept=".vcf,.vcf.gz"
                          label={t("vcfDropLabel")}
                          hint={t("vcfDropHint")}
                          file={vcf}
                          onFile={setVcf}
                          onClear={() => setVcf(null)}
                        />
                        <p className="text-[12px] text-muted-foreground mt-3">{t("vcfNote")}</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Submit */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.15 }}
            >
              <Button
                onClick={handleAnalyze}
                disabled={!hasAnyInput || analyzing}
                className="w-full h-12 rounded-xl bg-foreground text-background text-[15px] font-medium hover:bg-foreground/85 disabled:opacity-40 transition-all shadow-sm"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                    {t("analyzing")}
                  </span>
                ) : (
                  t("analyseButton")
                )}
              </Button>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Modality checklist + confidence ceiling */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.2 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-5"
            >
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("sidebarInputs")}</h3>
              <div className="space-y-3">
                {[
                  { id: "notes", label: t("sidebarNotes"), active: !!notes.trim(), icon: TAB_ICONS.notes },
                  { id: "photo", label: t("sidebarPhoto"), active: !!photo,        icon: TAB_ICONS.photo },
                  { id: "lab",   label: t("sidebarLab"),   active: !!lab,           icon: TAB_ICONS.lab   },
                  { id: "vcf",   label: t("sidebarVcf"),   active: !!vcf,           icon: TAB_ICONS.vcf   },
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 flex-shrink-0 ${item.active ? "bg-[oklch(0.52_0.19_160)]" : "border border-black/15 bg-[oklch(0.98_0_0)]"}`}>
                      {item.active ? (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="text-muted-foreground/50">{item.icon}</span>
                      )}
                    </div>
                    <span className={`text-[13px] transition-colors ${item.active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                    {item.active && <span className="ml-auto text-[10px] text-[oklch(0.52_0.19_160)] font-medium">✓</span>}
                  </div>
                ))}
              </div>

            </motion.div>

            {/* Analysis progress */}
            <AnimatePresence>
              {analyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white rounded-2xl border border-black/[0.06] p-4"
                >
                  <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("sidebarProgress")}</h3>
                  <div className="space-y-2">
                    {progress.map((step) => (
                      <ProgressStep key={step} label={step} active={step === activeStep} done={step !== activeStep} />
                    ))}
                    {activeStep && progress[progress.length - 1] === activeStep && (
                      <ProgressStep label={activeStep} active done={false} />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tip */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.3 }}
              className="rounded-xl bg-[oklch(0.52_0.21_255/0.06)] border border-[oklch(0.52_0.21_255/0.15)] p-4"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-3.5 h-3.5 text-[oklch(0.52_0.21_255)]" fill="none" viewBox="0 0 16 16">
                  <circle cx="8" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M6 10.5c0 1.1.9 2 2 2s2-.9 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M8 14.5v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <p className="text-[12px] text-[oklch(0.52_0.21_255)] font-medium">{t("tipTitle")}</p>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{t("tipBody")}</p>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
