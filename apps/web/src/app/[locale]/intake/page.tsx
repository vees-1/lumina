"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";
import { useMessages, useTranslations } from "next-intl";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { localizeHpoLabel, type HpoLabelMessages } from "@/lib/hpo";
import { getCaseById, saveCaseToStorage, scoreCase, suggestLab, suggestNotes, suggestPhoto, updateCaseInStorage } from "@/lib/api";
import type { GeneticEvidence, HPOTerm } from "@/types/lumina";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const SYMPTOM_CATEGORIES = [
  {
    id: "growth",
    i18nKey: "catGrowth",
    canonicalLabel: "Growth",
    symptoms: [
      { id: "shortStature", labelKey: "symptomShortStature", canonical: "Short stature" },
      { id: "failureToThrive", labelKey: "symptomFailureToThrive", canonical: "Failure to thrive" },
      { id: "microcephaly", labelKey: "symptomMicrocephaly", canonical: "Microcephaly" },
      { id: "macrocephaly", labelKey: "symptomMacrocephaly", canonical: "Macrocephaly" },
      { id: "tallStature", labelKey: "symptomTallStature", canonical: "Tall stature" },
      { id: "obesity", labelKey: "symptomObesity", canonical: "Obesity" },
    ],
  },
  {
    id: "neurological",
    i18nKey: "catNeurological",
    canonicalLabel: "Neurological",
    symptoms: [
      { id: "seizures", labelKey: "symptomSeizures", canonical: "Seizures" },
      { id: "developmentalDelay", labelKey: "symptomDevelopmentalDelay", canonical: "Developmental delay" },
      { id: "intellectualDisability", labelKey: "symptomIntellectualDisability", canonical: "Intellectual disability" },
      { id: "hypotonia", labelKey: "symptomHypotonia", canonical: "Hypotonia" },
      { id: "ataxia", labelKey: "symptomAtaxia", canonical: "Ataxia" },
      { id: "spasticity", labelKey: "symptomSpasticity", canonical: "Spasticity" },
      { id: "nystagmus", labelKey: "symptomNystagmus", canonical: "Nystagmus" },
    ],
  },
  {
    id: "facial",
    i18nKey: "catFacial",
    canonicalLabel: "Facial",
    symptoms: [
      { id: "hypertelorism", labelKey: "symptomHypertelorism", canonical: "Hypertelorism" },
      { id: "lowSetEars", labelKey: "symptomLowSetEars", canonical: "Low-set ears" },
      { id: "epicanthalFolds", labelKey: "symptomEpicanthalFolds", canonical: "Epicanthal folds" },
      { id: "broadNasalBridge", labelKey: "symptomBroadNasalBridge", canonical: "Broad nasal bridge" },
      { id: "upslantedPalpebralFissures", labelKey: "symptomUpslantedPalpebralFissures", canonical: "Upslanted palpebral fissures" },
      { id: "downslantedPalpebralFissures", labelKey: "symptomDownslantedPalpebralFissures", canonical: "Downslanted palpebral fissures" },
      { id: "shortPhiltrum", labelKey: "symptomShortPhiltrum", canonical: "Short philtrum" },
      { id: "micrognathia", labelKey: "symptomMicrognathia", canonical: "Micrognathia" },
    ],
  },
  {
    id: "skeletal",
    i18nKey: "catSkeletal",
    canonicalLabel: "Skeletal",
    symptoms: [
      { id: "clinodactyly", labelKey: "symptomClinodactyly", canonical: "Clinodactyly" },
      { id: "brachydactyly", labelKey: "symptomBrachydactyly", canonical: "Brachydactyly" },
      { id: "scoliosis", labelKey: "symptomScoliosis", canonical: "Scoliosis" },
      { id: "jointHypermobility", labelKey: "symptomJointHypermobility", canonical: "Joint hypermobility" },
      { id: "polydactyly", labelKey: "symptomPolydactyly", canonical: "Polydactyly" },
      { id: "syndactyly", labelKey: "symptomSyndactyly", canonical: "Syndactyly" },
    ],
  },
  {
    id: "metabolic",
    i18nKey: "catMetabolic",
    canonicalLabel: "Metabolic",
    symptoms: [
      { id: "hypoglycemia", labelKey: "symptomHypoglycemia", canonical: "Hypoglycemia" },
      { id: "lacticAcidosis", labelKey: "symptomLacticAcidosis", canonical: "Lactic acidosis" },
      { id: "metabolicAcidosis", labelKey: "symptomMetabolicAcidosis", canonical: "Metabolic acidosis" },
      { id: "hyperammonemia", labelKey: "symptomHyperammonemia", canonical: "Hyperammonemia" },
      { id: "developmentalRegression", labelKey: "symptomDevelopmentalRegression", canonical: "Developmental regression" },
      { id: "hepatomegaly", labelKey: "symptomHepatomegaly", canonical: "Hepatomegaly" },
    ],
  },
  {
    id: "renalHearing",
    i18nKey: "catRenalHearing",
    canonicalLabel: "Renal / Hearing",
    symptoms: [
      { id: "renalAnomaly", labelKey: "symptomRenalAnomaly", canonical: "Renal anomaly" },
      { id: "hydronephrosis", labelKey: "symptomHydronephrosis", canonical: "Hydronephrosis" },
      { id: "proteinuria", labelKey: "symptomProteinuria", canonical: "Proteinuria" },
      { id: "hearingImpairment", labelKey: "symptomHearingImpairment", canonical: "Hearing impairment" },
      { id: "sensorineuralHearingLoss", labelKey: "symptomSensorineuralHearingLoss", canonical: "Sensorineural hearing loss" },
    ],
  },
  {
    id: "cardiac",
    i18nKey: "catCardiac",
    canonicalLabel: "Cardiac",
    symptoms: [
      { id: "ventricularSeptalDefect", labelKey: "symptomVentricularSeptalDefect", canonical: "Ventricular septal defect" },
      { id: "atrialSeptalDefect", labelKey: "symptomAtrialSeptalDefect", canonical: "Atrial septal defect" },
      { id: "cardiomyopathy", labelKey: "symptomCardiomyopathy", canonical: "Cardiomyopathy" },
      { id: "arrhythmia", labelKey: "symptomArrhythmia", canonical: "Arrhythmia" },
      { id: "congenitalHeartDisease", labelKey: "symptomCongenitalHeartDisease", canonical: "Congenital heart disease" },
    ],
  },
] as const;

type Tab = "notes" | "photo" | "lab" | "genetic";

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
  genetic: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
      <path d="M8 1c0 0-2 2.5-2 5s2 5 2 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 1c0 0 2 2.5 2 5s-2 5-2 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3 5.5h10M3 10.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="14.5" r="1" fill="currentColor" />
    </svg>
  ),
};

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
  const messages = useMessages() as HpoLabelMessages;
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToId = searchParams.get("addTo");
  const existingCase = addToId ? getCaseById(addToId) : null;

  const usedModalities = addToId && existingCase ? existingCase.modalities : [];
  const firstUnused = (["notes", "photo", "lab", "genetic"] as Tab[]).find((m) => !usedModalities.includes(m)) ?? "notes";

  const [tab, setTab] = useState<Tab>(firstUnused);
  const [showChecklist, setShowChecklist] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["neurological"]));
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [isFacial, setIsFacial] = useState(false);
  const [lab, setLab] = useState<File | null>(null);
  const [geneSymbol, setGeneSymbol] = useState("");
  const [variant, setVariant] = useState("");
  const [classification, setClassification] = useState("unknown");
  const [zygosity, setZygosity] = useState("");
  const [patientName, setPatientName] = useState(existingCase?.patientContext?.patientName ?? "");
  const [age, setAge] = useState(existingCase?.patientContext?.age ?? "");
  const [sex, setSex] = useState(existingCase?.patientContext?.sex ?? "");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState("");
  const [suggestions, setSuggestions] = useState<HPOTerm[]>([]);
  const [isListening, setIsListening] = useState(false);

  const TABS: { id: Tab; label: string; hint: string }[] = [
    { id: "notes", label: t("tabNotesLabel"), hint: t("tabNotesHint") },
    { id: "photo", label: t("tabPhotoLabel"), hint: t("tabPhotoHint") },
    { id: "lab",   label: t("tabLabLabel"),   hint: t("tabLabHint")   },
    { id: "genetic", label: t("tabGeneticLabel"), hint: t("tabGeneticHint") },
  ];

  const geneticEvidence: GeneticEvidence[] = geneSymbol.trim()
    ? [{ gene_symbol: geneSymbol.trim().toUpperCase(), variant: variant.trim() || undefined, classification, zygosity: zygosity.trim() || undefined }]
    : [];
  const activeModalities = [!!notes.trim(), !!photo, !!lab, !!geneSymbol.trim()].filter(Boolean).length;
  const hasAnyInput = activeModalities > 0;
  const acceptedTerms = suggestions.filter((term) => term.review_status === "accepted");
  const pendingTerms = suggestions.filter((term) => term.review_status === "pending");
  const rejectedTerms = suggestions.filter((term) => term.review_status === "rejected");

  const addProgress = (msg: string) => {
    setActiveStep(msg);
    setProgress((p) => [...p, msg]);
  };

  const updateSuggestion = (hpoId: string, status: "accepted" | "rejected") => {
    setSuggestions((items) =>
      items.map((item) => item.hpo_id === hpoId ? { ...item, review_status: status } : item)
    );
  };

  const handleSuggest = async () => {
    if (!hasAnyInput) {
      toast.error(t("errorNoInput"));
      return;
    }

    setAnalyzing(true);
    setProgress([]);
    const trimmedNotes = notes.trim();

    try {
      const allTerms: HPOTerm[] = [];

      if (trimmedNotes) {
        allTerms.push(...await suggestNotes(trimmedNotes));
        addProgress(t("progressNotes"));
      }
      if (photo) {
        allTerms.push(...await suggestPhoto(photo, isFacial));
        addProgress(t("progressPhoto"));
      }
      if (lab) {
        try {
          allTerms.push(...await suggestLab(lab));
          addProgress(t("progressLab"));
        } catch (err) {
          console.warn(err);
          toast.error(t("errorLabFailed"));
        }
      }

      if (allTerms.length === 0) {
        toast.error(t("errorNoHpo"));
        setAnalyzing(false);
        return;
      }

      const termMap = new Map<string, HPOTerm>();
      for (const term of [...suggestions, ...allTerms]) {
        const existing = termMap.get(term.hpo_id);
        if (!existing || Math.abs(term.confidence) > Math.abs(existing.confidence)) {
          termMap.set(term.hpo_id, term);
        }
      }
      setSuggestions(Array.from(termMap.values()));
      toast.success(t("suggestionsReady"));
    } catch (err) {
      console.error(err);
      toast.error(t("errorApiFailed"));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!acceptedTerms.length && !geneticEvidence.length) {
      toast.error(t("errorNoAcceptedFindings"));
      return;
    }

    setAnalyzing(true);
    setProgress([]);
    const trimmedNotes = notes.trim();
    const modalities = [
      trimmedNotes ? "notes" : null,
      photo ? "photo" : null,
      lab ? "lab" : null,
      geneticEvidence.length ? "genetic" : null,
    ].filter(Boolean) as string[];
    const analysisTimestamp = new Date().valueOf();
    const intakeSnapshot = {
      timestamp: analysisTimestamp,
      notes: trimmedNotes || undefined,
      photo: photo ? { fileName: photo.name, isFacial } : undefined,
      lab: lab ? { fileName: lab.name } : undefined,
      genetic: geneticEvidence[0],
    };

    try {
      addProgress(t("progressScoring"));
      const termsForScoring = addToId && existingCase
        ? [...existingCase.hpoTerms, ...acceptedTerms]
        : acceptedTerms;
      const termMap = new Map<string, HPOTerm>();
      for (const term of termsForScoring) {
        const existing = termMap.get(term.hpo_id);
        if (!existing || Math.abs(term.confidence) > Math.abs(existing.confidence)) {
          termMap.set(term.hpo_id, { ...term, review_status: "accepted" });
        }
      }
      const dedupedTerms = Array.from(termMap.values());
      const mergedModalities = addToId && existingCase
        ? [...new Set([...existingCase.modalities, ...modalities])]
        : modalities;

      const mergedGeneticEvidence = addToId && existingCase
        ? [...(existingCase.geneticEvidence ?? []), ...geneticEvidence]
        : geneticEvidence;
      const rankings = await scoreCase(dedupedTerms, 10, mergedModalities.length, mergedGeneticEvidence);
      addProgress(t("progressRanking"));

      if (addToId && existingCase) {
        const mergedNotes = [existingCase.notes?.trim(), trimmedNotes].filter(Boolean).join("\n\n");
        updateCaseInStorage(addToId, {
          ...existingCase,
          timestamp: analysisTimestamp,
          notes: mergedNotes || existingCase.notes,
          modalities: mergedModalities,
          hpoTerms: dedupedTerms,
          rankings,
          inputHistory: [...(existingCase.inputHistory ?? []), intakeSnapshot],
          geneticEvidence: mergedGeneticEvidence,
          patientContext: { patientName: patientName || undefined, age: age || undefined, sex: sex || undefined },
        });
        router.push(`/case/${addToId}`);
      } else {
        const caseId = uuid();
        saveCaseToStorage({
          id: caseId,
          timestamp: analysisTimestamp,
          notes: trimmedNotes || undefined,
          inputHistory: [intakeSnapshot],
          modalities,
          hpoTerms: dedupedTerms,
          rankings,
          geneticEvidence: mergedGeneticEvidence,
          patientContext: { patientName: patientName || undefined, age: age || undefined, sex: sex || undefined },
        });
        router.push(`/case/${caseId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errorApiFailed"));
      setAnalyzing(false);
    }
  };

  function appendSymptom(categoryLabel: string, symptom: string, status: "present" | "absent") {
    const presentLabel = t("present");
    const absentLabel = t("absent");
    const statusLabel = status === "present" ? presentLabel : absentLabel;
    const nextLine = `${categoryLabel}: ${statusLabel} - ${symptom}.`;

    setNotes((prev) => {
      const lines = prev
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const symptomPattern = new RegExp(
        `^${categoryLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s+(?:${presentLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${absentLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s+-\\s+${symptom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.$`,
        "i",
      );
      const nextLines = lines.filter((line) => !symptomPattern.test(line));
      nextLines.push(nextLine);
      return nextLines.join("\n");
    });

  }

  function symptomState(categoryLabel: string, symptom: string) {
    const normalized = notes.toLowerCase();
    if (normalized.includes(`${categoryLabel.toLowerCase()}: ${t("present").toLowerCase()} - ${symptom.toLowerCase()}.`)) {
      return "present";
    }
    if (normalized.includes(`${categoryLabel.toLowerCase()}: ${t("absent").toLowerCase()} - ${symptom.toLowerCase()}.`)) {
      return "absent";
    }
    return null;
  }

  function toggleCategory(id: string) {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startVoiceInput() {
    type SpeechRecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      start: () => void;
    };
    const speechWindow = window as typeof window & {
      webkitSpeechRecognition?: SpeechRecognitionCtor;
      SpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(t("voiceUnsupported"));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t("voiceStopped"));
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) setNotes((prev) => [prev.trim(), transcript].filter(Boolean).join("\n"));
    };
    recognition.start();
  }

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-8 pt-16 sm:pt-20 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="pt-6 mb-6 sm:mb-8"
        >
          <h1 className="serif text-[24px] sm:text-[30px] tracking-tight">{addToId && existingCase ? t("titleAdd") : t("title")}</h1>
          <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1">{t("subtitle")}</p>
        </motion.div>


        {/* Add-mode banner */}
        {addToId && existingCase && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="bg-[oklch(0.52_0.21_255/0.06)] border border-[oklch(0.52_0.21_255/0.2)] rounded-xl px-4 py-3 mb-6"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-[oklch(0.52_0.21_255)] flex-shrink-0" fill="none" viewBox="0 0 16 16">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[13px] text-[oklch(0.52_0.21_255)]">{t("addingToCase")}</span>
            </div>
            <div className="mt-2.5 space-y-1 text-[12px] text-foreground/80">
              {existingCase.notes && (
                <p className="line-clamp-3 whitespace-pre-wrap">
                  {existingCase.notes}
                </p>
              )}
              {!!existingCase.inputHistory?.length && (
                <p className="text-muted-foreground">
                  {existingCase.inputHistory
                    .slice(-1)
                    .map((snapshot) => [snapshot.photo?.fileName, snapshot.lab?.fileName, snapshot.genetic?.gene_symbol].filter(Boolean).join(" · "))
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
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
                    !!geneSymbol.trim();
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
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() => setShowChecklist((s) => !s)}
                            className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-2"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                              <path d="M2 5h12M2 8h8M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            </svg>
                            {showChecklist ? t("hideChecklist") : t("quickAdd")}
                          </button>

                          {showChecklist && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-3 p-3 rounded-xl bg-[oklch(0.975_0_0)] border border-black/[0.06]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[12px] text-muted-foreground">
                                  {t("checklistDesc")}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-700">
                                    {t("present")}
                                  </span>
                                  <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5">
                                    {t("absent")}
                                  </span>
                                </div>
                              </div>
                              {SYMPTOM_CATEGORIES.map((category) => (
                                <div key={category.id}>
                                  <button
                                    type="button"
                                    onClick={() => toggleCategory(category.id)}
                                    className="w-full flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2"
                                  >
                                    <span>{t(category.i18nKey)}</span>
                                    <span className={`transition-transform ${openCategories.has(category.id) ? "rotate-90" : ""}`}>›</span>
                                  </button>
                                  {openCategories.has(category.id) && (
                                  <div className="space-y-1.5">
                                    {category.symptoms.map((symptom) => {
                                      const categoryLabel = t(category.i18nKey);
                                      const symptomLabel = t(symptom.labelKey);
                                      const state = symptomState(categoryLabel, symptomLabel);
                                      return (
                                        <div key={symptom.id} className="flex flex-wrap items-center gap-2">
                                          <span className="min-w-[180px] flex-1 text-[12px] text-foreground/85">
                                            {symptomLabel}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => appendSymptom(categoryLabel, symptomLabel, "present")}
                                              className={`rounded-full border px-2.5 py-1 text-[12px] transition-all ${
                                                state === "present"
                                                  ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-700"
                                                  : "border-black/10 bg-white text-foreground/75 hover:border-emerald-500/25 hover:bg-emerald-500/6"
                                              }`}
                                            >
                                              {t("present")}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => appendSymptom(categoryLabel, symptomLabel, "absent")}
                                              className={`rounded-full border px-2.5 py-1 text-[12px] transition-all ${
                                                state === "absent"
                                                  ? "border-slate-400 bg-slate-100 text-slate-700"
                                                  : "border-black/10 bg-white text-foreground/75 hover:border-slate-300 hover:bg-slate-50"
                                              }`}
                                            >
                                              {t("absent")}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  )}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-[12px] text-muted-foreground">{t("notesDesc")}</p>
                          <button
                            type="button"
                            onClick={startVoiceInput}
                            className="rounded-full border border-black/10 px-3 py-1 text-[12px] hover:border-black/20"
                          >
                            {isListening ? t("voiceListening") : t("voice")}
                          </button>
                        </div>
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

                    {tab === "genetic" && (
                      <div>
                        <p className="text-[12px] text-muted-foreground mb-3">{t("geneticDesc")}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input value={geneSymbol} onChange={(e) => setGeneSymbol(e.target.value)} placeholder={t("genePlaceholder")} className="h-10 px-3 rounded-lg border border-black/10 text-[13px] outline-none" />
                          <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder={t("variantPlaceholder")} className="h-10 px-3 rounded-lg border border-black/10 text-[13px] outline-none" />
                          <select value={classification} onChange={(e) => setClassification(e.target.value)} className="h-10 px-3 rounded-lg border border-black/10 text-[13px] outline-none bg-white">
                            <option value="unknown">{t("classificationUnknown")}</option>
                            <option value="pathogenic">{t("classificationPathogenic")}</option>
                            <option value="likely_pathogenic">{t("classificationLikelyPathogenic")}</option>
                            <option value="vus">VUS</option>
                            <option value="benign">{t("classificationBenign")}</option>
                          </select>
                          <input value={zygosity} onChange={(e) => setZygosity(e.target.value)} placeholder={t("zygosityPlaceholder")} className="h-10 px-3 rounded-lg border border-black/10 text-[13px] outline-none" />
                        </div>
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
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={handleSuggest}
                  disabled={!hasAnyInput || analyzing}
                  className="h-11 sm:h-10 w-full sm:min-w-[160px] sm:w-auto rounded-full bg-foreground px-6 text-[14px] font-medium text-background shadow-sm hover:bg-foreground/85 disabled:opacity-40"
                >
                  {analyzing ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                      </svg>
                      {t("analyzing")}
                    </span>
                  ) : (
                    t("suggestFindings")
                  )}
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={(!acceptedTerms.length && !geneticEvidence.length) || analyzing}
                  className="h-11 sm:h-10 w-full sm:min-w-[160px] sm:w-auto rounded-full bg-foreground px-6 text-[14px] font-medium text-background shadow-sm hover:bg-foreground/85 disabled:opacity-40"
                >
                  {t("runDifferential")}
                </Button>
              </div>
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
                  { id: "genetic", label: t("sidebarGenetic"), active: !!geneSymbol.trim(), icon: TAB_ICONS.genetic },
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

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.24 }}
              className="bg-white rounded-2xl border border-black/[0.06] p-5"
            >
              <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("reviewFindings")}</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">{t("pendingSuggestions")} ({pendingTerms.length})</p>
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {pendingTerms.length === 0 && <p className="text-[12px] text-muted-foreground">{t("noPendingSuggestions")}</p>}
                    {pendingTerms.map((term) => (
                      <div key={term.hpo_id} className="rounded-lg border border-black/10 p-2">
                        <p className="text-[12px] font-medium" title={`${term.hpo_id}\n${term.definition ?? ""}\nSource: ${term.source}`}>
                          {localizeHpoLabel(term.hpo_id, term.label, messages)}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{term.source}</p>
                        <div className="flex gap-1.5 mt-2">
                          <button type="button" onClick={() => updateSuggestion(term.hpo_id, "accepted")} className="rounded-full bg-emerald-600 text-white px-2.5 py-1 text-[11px]">{t("accept")}</button>
                          <button type="button" onClick={() => updateSuggestion(term.hpo_id, "rejected")} className="rounded-full border border-black/10 px-2.5 py-1 text-[11px]">{t("reject")}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">{t("acceptedFindings")} ({acceptedTerms.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {acceptedTerms.map((term) => (
                      <span key={term.hpo_id} title={`${term.hpo_id}\n${term.definition ?? ""}\nSource: ${term.source}`} className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] text-emerald-800">
                        {localizeHpoLabel(term.hpo_id, term.label, messages)}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">{t("rejectedFindings")} ({rejectedTerms.length})</p>
                </div>
                {geneticEvidence.length > 0 && (
                  <div className="rounded-lg bg-[oklch(0.97_0_0)] p-3 text-[12px]">
                    <p className="font-medium">{geneticEvidence[0].gene_symbol} · {geneticEvidence[0].classification}</p>
                    {geneticEvidence[0].variant && <p className="text-muted-foreground">{geneticEvidence[0].variant}</p>}
                  </div>
                )}
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
