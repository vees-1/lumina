"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { DashboardNav } from "@/components/nav";

interface DoctorProfile {
  name: string;
  specialty: string;
  clinic: string;
  license: string;
  contact: string;
  signature: string;
  referralTo: string;
  letterTone: string;
}

const emptyProfile: DoctorProfile = {
  name: "",
  specialty: "",
  clinic: "",
  license: "",
  contact: "",
  signature: "",
  referralTo: "Rare disease genetics clinic",
  letterTone: "Concise specialist referral",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile>(() => {
    if (typeof window === "undefined") return emptyProfile;
    const saved = localStorage.getItem("lumina_doc_info");
    if (!saved) return emptyProfile;
    try {
      const parsed = JSON.parse(saved) as Partial<DoctorProfile> & { specialization?: string };
      return {
        ...emptyProfile,
        ...parsed,
        specialty: parsed.specialty ?? parsed.specialization ?? "",
      };
    } catch {
      return emptyProfile;
    }
  });

  function update<K extends keyof DoctorProfile>(key: K, value: DoctorProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function save() {
    localStorage.setItem("lumina_doc_info", JSON.stringify(profile));
    toast.success("Doctor profile saved");
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardNav />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28">
        <div className="mb-8">
          <h1 className="text-[40px] font-bold tracking-[-0.03em] text-[#2f3037]">Doctor profile</h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-7 text-[#555b6d]">
            Save doctor information once and reuse it across referral letters, printed case reports, and clinical handoff documents.
          </p>
        </div>

        <section className="rounded-lg border border-[#e5e8f0] bg-white p-7">
          <div className="grid gap-5 md:grid-cols-2">
            {[
              ["name", "Doctor name", "Dr. Jane Smith"],
              ["specialty", "Specialty", "Clinical genetics"],
              ["clinic", "Clinic name", "Lumina Rare Disease Clinic"],
              ["license", "License / registration", "Medical registration number"],
              ["contact", "Contact", "clinic@example.com"],
              ["referralTo", "Default referral destination", "Rare disease genetics clinic"],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block">
                <span className="mb-2 block text-[13px] font-bold text-[#3d414d]">{label}</span>
                <input
                  value={profile[key as keyof DoctorProfile]}
                  onChange={(event) => update(key as keyof DoctorProfile, event.target.value)}
                  placeholder={placeholder}
                  className="h-11 w-full rounded border border-[#cfd5e2] px-4 text-[14px] outline-none focus:border-[#38b6e8] focus:ring-2 focus:ring-[#38b6e8]/15"
                />
              </label>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-[13px] font-bold text-[#3d414d]">Signature / letter details</span>
            <textarea
              value={profile.signature}
              onChange={(event) => update("signature", event.target.value)}
              placeholder="Dr. Jane Smith, MD, Clinical Genetics, Lumina Clinic"
              rows={4}
              className="w-full rounded border border-[#cfd5e2] px-4 py-3 text-[14px] outline-none focus:border-[#38b6e8] focus:ring-2 focus:ring-[#38b6e8]/15"
            />
          </label>

          <label className="mt-5 block">
            <span className="mb-2 block text-[13px] font-bold text-[#3d414d]">Default referral preference</span>
            <select
              value={profile.letterTone}
              onChange={(event) => update("letterTone", event.target.value)}
              className="h-11 w-full rounded border border-[#cfd5e2] px-4 text-[14px] outline-none focus:border-[#38b6e8] focus:ring-2 focus:ring-[#38b6e8]/15"
            >
              <option>Concise specialist referral</option>
              <option>Detailed evidence summary</option>
              <option>Patient-friendly summary</option>
            </select>
          </label>

          <button onClick={save} className="mt-7 inline-flex items-center gap-2 rounded bg-[#38b6e8] px-6 py-3 text-[14px] font-bold text-white">
            <Save className="h-4 w-4" />
            Save profile
          </button>
        </section>
      </main>
    </div>
  );
}
