"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
import { DashboardNav } from "@/components/nav";
import { savePatientSubmission } from "@/lib/api";

export default function PatientNewSubmissionPage() {
  const locale = useLocale();
  const router = useRouter();
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [lab, setLab] = useState<File | null>(null);
  const [gene, setGene] = useState("");
  const [variant, setVariant] = useState("");
  const [classification, setClassification] = useState("unknown");

  function submit() {
    if (!notes.trim() && !photo && !lab && !gene.trim()) {
      toast.error("Add at least one evidence item before submitting.");
      return;
    }
    savePatientSubmission({
      id: uuid(),
      timestamp: Date.now(),
      patientName: patientName || undefined,
      age: age || undefined,
      sex: sex || undefined,
      notes: notes.trim() || undefined,
      photoFileName: photo?.name,
      labFileName: lab?.name,
      geneticEvidence: gene.trim() ? { gene_symbol: gene.trim().toUpperCase(), variant: variant || undefined, classification } : undefined,
      status: "doctor_review_pending",
    });
    toast.success("Submission saved for doctor review.");
    router.push(`/${locale}/patient/submissions`);
  }

  return (
    <div className="min-h-screen bg-white text-[#2f3037]">
      <DashboardNav />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <div className="mb-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#2536a0]">Patient submission</p>
          <h1 className="mt-2 text-[40px] font-bold tracking-[-0.04em]">Send evidence to your doctor</h1>
          <p className="mt-2 max-w-2xl text-[16px] leading-7 text-[#62687a]">This does not generate a diagnosis. It creates a pending package for doctor review.</p>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-lg border border-[#e5e8f0] p-6">
              <h2 className="text-[22px] font-bold">Patient context</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" className="h-11 rounded border border-[#dce2ee] px-3 text-[14px]" />
                <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="h-11 rounded border border-[#dce2ee] px-3 text-[14px]" />
                <select value={sex} onChange={(e) => setSex(e.target.value)} className="h-11 rounded border border-[#dce2ee] px-3 text-[14px]">
                  <option value="">Sex unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e8f0] p-6">
              <h2 className="text-[22px] font-bold">Evidence</h2>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Symptoms, timeline, previous diagnoses, questions for the doctor..." className="mt-4 w-full rounded border border-[#dce2ee] px-4 py-3 text-[14px]" />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="rounded border border-dashed border-[#9eb0ce] p-5 text-[14px] font-semibold text-[#2536a0]">
                  Patient photo
                  <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-3 block text-[#62687a]" />
                </label>
                <label className="rounded border border-dashed border-[#9eb0ce] p-5 text-[14px] font-semibold text-[#2536a0]">
                  Lab report
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setLab(e.target.files?.[0] ?? null)} className="mt-3 block text-[#62687a]" />
                </label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <input value={gene} onChange={(e) => setGene(e.target.value)} placeholder="Gene symbol" className="h-11 rounded border border-[#dce2ee] px-3 text-[14px]" />
                <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="Variant note" className="h-11 rounded border border-[#dce2ee] px-3 text-[14px]" />
                <select value={classification} onChange={(e) => setClassification(e.target.value)} className="h-11 rounded border border-[#dce2ee] px-3 text-[14px]">
                  <option value="unknown">Unknown</option>
                  <option value="pathogenic">Pathogenic</option>
                  <option value="likely_pathogenic">Likely pathogenic</option>
                  <option value="vus">VUS</option>
                  <option value="benign">Benign</option>
                </select>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-[#e5e8f0] bg-[#f8fbff] p-6">
            <h2 className="text-[22px] font-bold">Doctor review gate</h2>
            <p className="mt-3 text-[15px] leading-7 text-[#62687a]">Lumina will not show a patient scorecard until a doctor approves HPO evidence and runs scoring.</p>
            <button type="button" onClick={submit} className="mt-6 w-full rounded bg-[#38b6e8] px-5 py-3 text-[14px] font-bold text-white">Submit for review</button>
          </aside>
        </section>
      </main>
    </div>
  );
}
