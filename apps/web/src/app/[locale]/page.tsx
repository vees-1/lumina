"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from "framer-motion";
import { useTranslations } from "next-intl";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";

/* ── Animation variants ───────────────────────────────────────────────────── */
const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ── Sub-components ───────────────────────────────────────────────────────── */

function StatCard({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const duration = 1800;
    const raf = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(raf);
      else setCount(value);
    };
    requestAnimationFrame(raf);
  }, [inView, value]);

  return (
    <motion.div ref={ref} variants={fadeUp} className="text-center">
      <div className="serif text-5xl tracking-tight text-foreground">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-[15px] text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function ModalityCard({
  icon, title, description, delay,
}: {
  icon: React.ReactNode; title: string; description: string; delay: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [6, -6]);
  const rotateY = useTransform(x, [-60, 60], [-6, 6]);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 30 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay }}
      viewport={{ once: true }}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 800 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className="group relative bg-white rounded-2xl border border-black/[0.06] p-6 hover:shadow-[0_8px_40px_oklch(0_0_0/0.1)] transition-shadow duration-300 cursor-default"
    >
      <div className="w-11 h-11 rounded-xl bg-[oklch(0.97_0_0)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-semibold text-[15px] tracking-tight mb-1">{title}</h3>
      <p className="text-[13px] text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

function StepCard({ num, title, description }: { num: string; title: string; description: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.6, ease }}
      className="flex gap-6 items-start"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground text-background text-[13px] font-bold flex items-center justify-center">
        {num}
      </div>
      <div>
        <h3 className="font-semibold text-[17px] tracking-tight">{title}</h3>
        <p className="mt-1 text-[15px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const t = useTranslations("landing");
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div className="relative overflow-x-hidden">
      <Nav transparent />

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-[oklch(0.52_0.21_255)] origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-white"
      >
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Hero content — vertically centred, generous spacing */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center px-8 w-full max-w-5xl mx-auto"
        >
          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/10 bg-white/80 backdrop-blur-sm text-[12px] font-medium text-muted-foreground mb-10"
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-[oklch(0.52_0.21_255)]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[oklch(0.52_0.21_255)]" />
            </span>
            {t("betaPill")}
          </motion.div>

          {/* Giant headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.15 }}
            className="font-[family-name:var(--font-serif)] text-[clamp(4.5rem,10vw,8.5rem)] font-normal tracking-[-0.02em] leading-[0.92] text-foreground mb-8 whitespace-pre-line"
          >
            {t("heroHeadline")}
          </motion.h1>

          {/* Subtitle — one clean line */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.32 }}
            className="text-[1.15rem] text-muted-foreground mb-12 max-w-sm leading-relaxed"
          >
            {t("heroSub")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.46 }}
            className="flex items-center gap-3"
          >
            <Link href="/sign-up">
              <Button className="h-12 px-8 rounded-full bg-foreground text-background text-[15px] font-medium hover:bg-foreground/85 shadow-[0_2px_24px_oklch(0_0_0/0.14)] hover:shadow-[0_6px_32px_oklch(0_0_0/0.2)] transition-all duration-300">
                {t("getStartedFree")}
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="ghost" className="h-12 px-6 rounded-full text-[15px] text-muted-foreground hover:text-foreground border border-black/10 hover:bg-black/[0.04]">
                {t("howItWorks")}
                <svg className="ml-1.5 w-4 h-4" fill="none" viewBox="0 0 16 16">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <svg className="w-5 h-5 text-black/20" fill="none" viewBox="0 0 20 20">
              <path d="M10 4v12M7 13l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-[oklch(0.975_0_0)] py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[13px] font-medium text-[oklch(0.52_0.21_255)] mb-3 tracking-wider uppercase">
              {t("workflowLabel")}
            </motion.p>
            <motion.h2 variants={fadeUp} className="serif text-[clamp(2rem,5vw,3.25rem)] tracking-tight mb-4">
              {t("workflowHeadline")}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[17px] text-muted-foreground max-w-xl mx-auto">
              {t("workflowSub")}
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <StepCard num="01" title={t("step1Title")} description={t("step1Desc")} />
              <StepCard num="02" title={t("step2Title")} description={t("step2Desc")} />
              <StepCard num="03" title={t("step3Title")} description={t("step3Desc")} />
              <StepCard num="04" title={t("step4Title")} description={t("step4Desc")} />
            </div>

            {/* Animated pipeline visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease }}
              className="hidden md:block"
            >
              <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6 space-y-3">
                {[
                  { label: t("clinicalNotes"), tag: "NER", color: "oklch(0.52 0.21 255)", terms: 12 },
                  { label: t("facialPhoto"), tag: "Vision", color: "oklch(0.65 0.18 200)", terms: 7 },
                  { label: t("labReport"), tag: "OCR+AI", color: "oklch(0.60 0.20 285)", terms: 9 },
                  { label: t("geneticEvidence"), tag: t("manualTag"), color: "oklch(0.52 0.19 160)", terms: t("evidenceTag") },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12, duration: 0.5, ease }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[oklch(0.975_0_0)]"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-[13px] font-medium flex-1">{item.label}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-black/10 text-muted-foreground">
                      {item.tag}
                    </span>
                    <span className="text-[12px] font-semibold" style={{ color: item.color }}>
                      {typeof item.terms === "number" ? `${item.terms} ${t("pipelineTerms")}` : item.terms}
                    </span>
                  </motion.div>
                ))}
                <div className="pt-2 border-t border-black/[0.06] flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[oklch(0.97_0_0)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "96%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease, delay: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-[oklch(0.52_0.21_255)] to-[oklch(0.65_0.18_200)]"
                    />
                  </div>
                  <span className="text-[13px] font-bold text-[oklch(0.52_0.21_255)]">96%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Modalities ────────────────────────────────────────────────────── */}
      <section id="modalities" className="bg-white py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[13px] font-medium text-[oklch(0.52_0.21_255)] mb-3 tracking-wider uppercase">
              {t("technologyLabel")}
            </motion.p>
            <motion.h2 variants={fadeUp} className="serif text-[clamp(2rem,5vw,3.25rem)] tracking-tight mb-4">
              {t("technologyHeadline")}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-[17px] text-muted-foreground max-w-lg mx-auto">
              {t("technologySub")}
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ModalityCard delay={0} icon={<NoteIcon />} title={t("modalityNoteTitle")} description={t("modalityNoteDesc")} />
            <ModalityCard delay={0.07} icon={<PhotoIcon />} title={t("modalityPhotoTitle")} description={t("modalityPhotoDesc")} />
            <ModalityCard delay={0.14} icon={<LabIcon />} title={t("modalityLabTitle")} description={t("modalityLabDesc")} />
            <ModalityCard delay={0.21} icon={<DnaIcon />} title={t("modalityDnaTitle")} description={t("modalityDnaDesc")} />
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section id="stats" className="bg-[oklch(0.975_0_0)] py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[13px] font-medium text-[oklch(0.52_0.21_255)] mb-3 tracking-wider uppercase">
              {t("scienceLabel")}
            </motion.p>
            <motion.h2 variants={fadeUp} className="serif text-[clamp(2rem,5vw,3.25rem)] tracking-tight">
              {t("scienceHeadline")}
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerFast}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <StatCard value={7000} label={t("statRareDiseases")} suffix="+" />
            <StatCard value={30000} label={t("statHpoTerms")} suffix="+" />
            <StatCard value={4} label={t("statModalities")} />
            <StatCard value={100} label={t("statScoring")} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.3 }}
            className="mt-12 grid md:grid-cols-3 gap-4"
          >
            {[
              { title: "Orphanet", desc: t("orphanetDesc") },
              { title: "HPO Ontology", desc: t("hpoOntologyDesc") },
              { title: "ClinVar", desc: t("clinvarDesc") },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-black/[0.06] p-5">
                <div className="text-[13px] font-semibold mb-1.5">{item.title}</div>
                <div className="text-[13px] text-muted-foreground">{item.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="relative bg-foreground py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-1" style={{ opacity: 0.15 }} />
          <div className="orb orb-2" style={{ opacity: 0.12 }} />
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 text-center max-w-2xl mx-auto"
        >
          <motion.h2 variants={fadeUp} className="serif text-[clamp(2.5rem,6vw,4rem)] tracking-tight text-white mb-4">
            {t("ctaHeadline")}
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[17px] text-white/60 mb-10">
            {t("ctaSub")}
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link href="/sign-up">
              <Button className="h-11 px-8 rounded-full bg-white text-foreground text-[15px] font-medium hover:bg-white/90 shadow-lg transition-all duration-300">
                {t("getEarlyAccess")}
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost" className="h-11 px-8 rounded-full text-[15px] text-white/70 hover:text-white hover:bg-white/10 border border-white/20">
                {t("signIn")}
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-foreground border-t border-white/10 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="4" r="2" fill="white" />
                <circle cx="4" cy="11" r="2" fill="white" opacity="0.6" />
                <circle cx="12" cy="11" r="2" fill="white" opacity="0.6" />
                <line x1="8" y1="6" x2="4" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
                <line x1="8" y1="6" x2="12" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
              </svg>
            </div>
            <span className="text-[13px] font-medium">Lumina</span>
          </div>
          <p className="text-[12px] text-white/40">
            &copy; {new Date().getFullYear()} Lumina. {t("footerTagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function NoteIcon() {
  return (
    <svg className="w-5 h-5 text-[oklch(0.52_0.21_255)]" fill="none" viewBox="0 0 20 20">
      <path d="M6 6h8M6 10h8M6 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg className="w-5 h-5 text-[oklch(0.65_0.18_200)]" fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 4h5L14 6h3a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1h3l1.5-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function LabIcon() {
  return (
    <svg className="w-5 h-5 text-[oklch(0.60_0.20_285)]" fill="none" viewBox="0 0 20 20">
      <path d="M8 3v6.5L5 14.5A2 2 0 007 17h6a2 2 0 002-2.5L12 9.5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 3h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 12.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DnaIcon() {
  return (
    <svg className="w-5 h-5 text-[oklch(0.52_0.19_160)]" fill="none" viewBox="0 0 20 20">
      <path d="M5 3c2 2 8 3 8 7S7 15 5 17M15 3c-2 2-8 3-8 7s6 5 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5.5 8h9M5.5 12h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
