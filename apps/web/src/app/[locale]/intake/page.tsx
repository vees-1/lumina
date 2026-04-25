"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { saveCaseToStorage, scoreCase, submitLab, submitNotes, submitPhoto, submitVcf } from "@/lib/api";
import type { HPOTerm } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Tab = "notes" | "photo" | "lab" | "vcf";
const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "notes", label: "Clinical Notes", hint: "Patient history, symptoms, clinical observations" },
  { id: "photo", label: "Clinical Photo", hint: "Facial dysmorphology, clinical manifestations" },
  { id: "lab", label: "Lab Report", hint: "Blood panels, metabolic screens, imaging" },
  { id: "vcf", label: "Genomic Data", hint: "VCF file from WES/WGS sequencing" },
];

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
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notes");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [isFacial, setIsFacial] = useState(false);
  const [lab, setLab] = useState<File | null>(null);
  const [vcf, setVcf] = useState<File | null>(null);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState("");

  const hasAnyInput = notes.trim() || photo || lab || vcf;

  const addProgress = (msg: string) => {
    setActiveStep(msg);
    setProgress((p) => [...p, msg]);
  };

  const handleAnalyze = async () => {
    if (!hasAnyInput) {
      toast.error("Add at least one input to analyze");
      return;
    }

    setAnalyzing(true);
    setProgress([]);
    const allTerms: HPOTerm[] = [];
    const modalities: string[] = [];

    try {
      const calls: Promise<void>[] = [];

      if (notes.trim()) {
        calls.push(
          submitNotes(notes.trim()).then((terms) => {
            allTerms.push(...terms);
            modalities.push("notes");
            addProgress("Clinical notes analyzed");
          })
        );
      }
      if (photo) {
        calls.push(
          submitPhoto(photo, isFacial).then((terms) => {
            allTerms.push(...terms);
            modalities.push("photo");
            addProgress("Clinical photo analyzed");
          })
        );
      }
      if (lab) {
        calls.push(
          submitLab(lab).then((terms) => {
            allTerms.push(...terms);
            modalities.push("lab");
            addProgress("Lab report analyzed");
          })
        );
      }
      if (vcf) {
        calls.push(
          submitVcf(vcf).then((terms) => {
            allTerms.push(...terms);
            modalities.push("vcf");
            addProgress("Genomic data analyzed");
          })
        );
      }

      await Promise.all(calls);

      if (allTerms.length === 0) {
        toast.error("No HPO phenotypes extracted — try adding more detail");
        setAnalyzing(false);
        return;
      }

      addProgress("Scoring against disease database…");

      // Deduplicate by hpo_id, keep highest confidence
      const termMap = new Map<string, HPOTerm>();
      for (const t of allTerms) {
        const existing = termMap.get(t.hpo_id);
        if (!existing || t.confidence > existing.confidence) termMap.set(t.hpo_id, t);
      }
      const dedupedTerms = Array.from(termMap.values());

      const rankings = await scoreCase(dedupedTerms, 10);
      addProgress("Ranking complete");

      const caseId = uuid();
      saveCaseToStorage({
        id: caseId,
        timestamp: Date.now(),
        notes: notes.trim() || undefined,
        modalities,
        hpoTerms: dedupedTerms,
        rankings,
        patientContext: { age: age || undefined, sex: sex || undefined },
      });

      router.push(`/case/${caseId}`);
    } catch (err) {
      console.error(err);
      toast.error("Analysis failed — is the API running?");
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-3xl mx-auto px-6 pt-20 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="pt-6 mb-8"
        >
          <h1 className="serif text-[28px] tracking-tight">New case</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Submit any combination of clinical inputs — Lumina handles the rest.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_220px] gap-6">
          <div className="space-y-4">
            {/* Patient context */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.05 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-5"
            >
              <h2 className="text-[14px] font-semibold mb-3">Patient context <span className="text-muted-foreground font-normal">(optional)</span></h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Age</label>
                  <input
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 8 years"
                    className="w-full h-9 px-3 rounded-lg border border-black/10 text-[13px] outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Sex</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-black/10 text-[13px] outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all bg-white appearance-none"
                  >
                    <option value="">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Modality tabs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.1 }}
              className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden"
            >
              {/* Tab bar */}
              <div className="flex border-b border-black/[0.06] overflow-x-auto scrollbar-none">
                {TABS.map((t) => {
                  const hasData =
                    t.id === "notes" ? !!notes.trim() :
                    t.id === "photo" ? !!photo :
                    t.id === "lab" ? !!lab :
                    !!vcf;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium transition-all border-b-2 ${
                        tab === t.id
                          ? "text-foreground border-foreground"
                          : "text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      {t.label}
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
                        <p className="text-[12px] text-muted-foreground mb-3">
                          Enter clinical notes, patient history, symptom descriptions, or consultation summaries.
                        </p>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Patient is a 6-year-old male presenting with febrile seizures onset at 5 months. EEG shows irregular spike-wave complexes. Developmental regression noted after first seizure cluster. Family history of epilepsy on maternal side..."
                          rows={8}
                          className="w-full px-4 py-3 rounded-xl border border-black/10 text-[14px] leading-relaxed outline-none focus:border-[oklch(0.52_0.21_255)] focus:ring-2 focus:ring-[oklch(0.52_0.21_255/0.15)] transition-all resize-none font-mono text-muted-foreground placeholder:text-black/25"
                        />
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {notes.length} characters · Claude NER extracts HPO terms
                        </p>
                      </div>
                    )}

                    {tab === "photo" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">
                          Upload a clinical photograph for AI vision analysis.
                        </p>
                        <DropZone
                          accept="image/*"
                          label="Drop clinical photo"
                          hint="JPEG, PNG, HEIC up to 20MB"
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
                            Enable facial dysmorphology analysis (FGDD vocabulary)
                          </span>
                        </label>
                      </div>
                    )}

                    {tab === "lab" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">
                          Upload a lab report image or PDF screenshot for OCR + AI interpretation.
                        </p>
                        <DropZone
                          accept="image/*,.pdf"
                          label="Drop lab report"
                          hint="JPEG, PNG, PDF up to 20MB"
                          file={lab}
                          onFile={setLab}
                          onClear={() => setLab(null)}
                        />
                      </div>
                    )}

                    {tab === "vcf" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">
                          Upload a VCF file from whole-exome or whole-genome sequencing.
                        </p>
                        <DropZone
                          accept=".vcf,.vcf.gz"
                          label="Drop VCF file"
                          hint=".vcf or .vcf.gz — ClinVar-annotated preferred"
                          file={vcf}
                          onFile={setVcf}
                          onClear={() => setVcf(null)}
                        />
                        <p className="text-[12px] text-muted-foreground mt-3">
                          Pathogenic/likely-pathogenic variants are resolved through gene → disease → HPO chains.
                        </p>
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
                    Analyzing…
                  </span>
                ) : (
                  "Analyze case"
                )}
              </Button>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Modality checklist */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.2 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-4"
            >
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inputs</h3>
              <div className="space-y-2.5">
                {[
                  { id: "notes", label: "Clinical notes", active: !!notes.trim() },
                  { id: "photo", label: "Clinical photo", active: !!photo },
                  { id: "lab", label: "Lab report", active: !!lab },
                  { id: "vcf", label: "Genomic data", active: !!vcf },
                ].map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center transition-all duration-300 ${item.active ? "bg-[oklch(0.52_0.19_160)]" : "border border-black/15"}`}>
                      {item.active && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                          <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-[13px] transition-colors ${item.active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
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
                  <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Progress</h3>
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
              <p className="text-[12px] text-[oklch(0.52_0.21_255)] font-medium mb-1">Tip</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                More modalities = higher confidence. Adding genomic data alongside notes typically doubles accuracy.
              </p>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
