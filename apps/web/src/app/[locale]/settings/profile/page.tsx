"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { User, Award, BookOpen, Save, ArrowLeft, Shield, Mail, Building2 } from "lucide-react";
import Link from "next/link";
import { DashboardNav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DocInfo {
  name: string;
  specialization: string;
  degree: string;
  clinic: string;
  license: string;
  contact: string;
}

export default function ProfilePage() {
  const t = useTranslations("docInfo");
  const [info, setInfo] = useState<DocInfo>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lumina_doc_info");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse doc info", e);
        }
      }
    }
    return { name: "", specialization: "", degree: "", clinic: "", license: "", contact: "" };
  });

  const handleSave = () => {
    localStorage.setItem("lumina_doc_info", JSON.stringify(info));
    toast.success(t("saved"));
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
              <p className="text-[14px] text-muted-foreground mt-1">{t("subtitle")}</p>
            </div>
            <Link 
              href="/dashboard" 
              className="h-8 px-3 rounded-full border border-black/5 bg-black/5 hover:bg-black/10 text-[12px] font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("back")}
            </Link>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground ml-1">{t("name")}</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <input
                      value={info.name}
                      onChange={(e) => setInfo({ ...info, name: e.target.value })}
                      placeholder={t("namePlaceholder")}
                      className="w-full h-10 pl-10 pr-4 rounded-full border border-black/5 bg-black/[0.02] text-[14px] outline-none focus:border-foreground focus:bg-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground ml-1">{t("specialization")}</label>
                  <div className="relative group">
                    <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <input
                      value={info.specialization}
                      onChange={(e) => setInfo({ ...info, specialization: e.target.value })}
                      placeholder={t("specializationPlaceholder")}
                      className="w-full h-10 pl-10 pr-4 rounded-full border border-black/5 bg-black/[0.02] text-[14px] outline-none focus:border-foreground focus:bg-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground ml-1">{t("degree")}</label>
                  <div className="relative group">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <input
                      value={info.degree}
                      onChange={(e) => setInfo({ ...info, degree: e.target.value })}
                      placeholder={t("degreePlaceholder")}
                      className="w-full h-10 pl-10 pr-4 rounded-full border border-black/5 bg-black/[0.02] text-[14px] outline-none focus:border-foreground focus:bg-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground ml-1">{t("license")}</label>
                  <div className="relative group">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <input
                      value={info.license}
                      onChange={(e) => setInfo({ ...info, license: e.target.value })}
                      placeholder={t("licensePlaceholder")}
                      className="w-full h-10 pl-10 pr-4 rounded-full border border-black/5 bg-black/[0.02] text-[14px] outline-none focus:border-foreground focus:bg-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground ml-1">{t("clinic")}</label>
                <div className="relative group">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <input
                    value={info.clinic}
                    onChange={(e) => setInfo({ ...info, clinic: e.target.value })}
                    placeholder={t("clinicPlaceholder")}
                    className="w-full h-10 pl-10 pr-4 rounded-full border border-black/5 bg-black/[0.02] text-[14px] outline-none focus:border-foreground focus:bg-transparent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground ml-1">{t("contact")}</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <input
                    value={info.contact}
                    onChange={(e) => setInfo({ ...info, contact: e.target.value })}
                    placeholder={t("contactPlaceholder")}
                    className="w-full h-10 pl-10 pr-4 rounded-full border border-black/5 bg-black/[0.02] text-[14px] outline-none focus:border-foreground focus:bg-transparent transition-all"
                  />
                </div>
              </div>
            </section>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                className="w-full h-12 rounded-full bg-foreground text-background font-medium text-[15px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                {t("save")}
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
