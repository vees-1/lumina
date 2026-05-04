"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { User, Award, BookOpen, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DoctorProfile {
  name: string;
  specialization: string;
  degree: string;
  clinic: string;
}

export default function ProfilePage() {
  const t = useTranslations("profile");
  const [profile, setProfile] = useState<DoctorProfile>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lumina_doctor_profile");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse profile", e);
        }
      }
    }
    return { name: "", specialization: "", degree: "", clinic: "" };
  });

  const handleSave = () => {
    localStorage.setItem("lumina_doctor_profile", JSON.stringify(profile));
    toast.success("Profile saved successfully");
  };

  return (
    <div className="min-h-screen bg-[oklch(0.975_0_0)]">
      <DashboardNav />

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("back")}
          </Link>

          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-sm">
            <div className="bg-foreground p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="serif text-[24px] leading-tight">{t("title")}</h1>
                  <p className="text-white/60 text-[14px]">{t("subtitle")}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("name")}
                  </label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder={t("namePlaceholder")}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[oklch(0.99_0_0)] text-[14px] outline-none focus:border-foreground transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("specialization")}
                  </label>
                  <input
                    value={profile.specialization}
                    onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                    placeholder={t("specializationPlaceholder")}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[oklch(0.99_0_0)] text-[14px] outline-none focus:border-foreground transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("degree")}
                  </label>
                  <input
                    value={profile.degree}
                    onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                    placeholder={t("degreePlaceholder")}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[oklch(0.99_0_0)] text-[14px] outline-none focus:border-foreground transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 16 16">
                      <path d="M2 14V6l6-4 6 4v8H2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t("clinic")}
                  </label>
                  <input
                    value={profile.clinic}
                    onChange={(e) => setProfile({ ...profile, clinic: e.target.value })}
                    placeholder={t("clinicPlaceholder")}
                    className="w-full h-11 px-4 rounded-xl border border-black/10 bg-[oklch(0.99_0_0)] text-[14px] outline-none focus:border-foreground transition-all"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  className="w-full h-12 rounded-xl bg-foreground text-background font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {t("save")}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
