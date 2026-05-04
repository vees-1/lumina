"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, Menu, X, User } from "lucide-react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getApiHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Nav({ transparent = false }: { transparent?: boolean }) {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { isSignedIn } = useAuth();

  const NAV_LINKS = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#modalities", label: t("technology") },
    { href: "#stats", label: t("science") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const frosted = !transparent || scrolled;

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          frosted
            ? "glass-strong shadow-[0_1px_0_oklch(0_0_0/0.06)]"
            : "bg-transparent"
        )}
      >
        <nav className="mx-auto max-w-6xl flex items-center justify-between h-12 px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-7 h-7">
              <div className="absolute inset-0 rounded-[8px] bg-foreground flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="4" r="2" fill="white" />
                  <circle cx="4" cy="11" r="2" fill="white" opacity="0.6" />
                  <circle cx="12" cy="11" r="2" fill="white" opacity="0.6" />
                  <line x1="8" y1="6" x2="4" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
                  <line x1="8" y1="6" x2="12" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-[8px] ring-2 ring-foreground/20 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
            </div>
            <span className="font-semibold text-[15px] tracking-[-0.01em]">Lumina</span>
          </Link>

          {/* Center links (landing only) */}
          {isLanding && (
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-black/5"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {!isSignedIn ? (
              <>
                <Link href="/sign-in" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="text-[13px] h-7">
                    {t("signIn")}
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85 px-3">
                    {t("getStarted")}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {!pathname.startsWith("/dashboard") ? (
                  <Link href="/dashboard">
                    <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85 px-3">
                      {t("dashboard")}
                    </Button>
                  </Link>
                ) : (
                  <Link href="/intake">
                    <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85 px-2 sm:px-3">
                      <span className="hidden xs:inline">{t("newCase")}</span>
                      <span className="xs:hidden">+</span>
                    </Button>
                  </Link>
                )}
                <UserButton>
            <UserButton.MenuItems>
              <UserButton.Link
                label={t("docInfo")}
                labelIcon={<div className="w-4 h-4 flex items-center justify-center text-muted-foreground"><User className="w-3.5 h-3.5" /></div>}
                href="/settings/profile"
              />
            </UserButton.MenuItems>
          </UserButton>
              </>
            )}

            {/* Mobile menu button */}
            {isLanding && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors md:hidden"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 z-40 glass-strong md:hidden pt-12"
          >
            <div className="flex flex-col gap-4 p-8">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-xl font-medium py-2 border-b border-black/5" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-4">
                <LanguageSwitcher />
                {!isSignedIn && (
                  <Link href="/sign-in" onClick={() => setMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start h-12 text-lg rounded-xl">
                      {t("signIn")}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const LOCALES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
] as const;

function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const current = pathname.split("/")[1];
  const activeLocale = LOCALES.find((l) => l.code === current)?.code ?? "en";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSwitch(code: string) {
    const segments = pathname.split("/");
    const hasLocale = LOCALES.some((l) => l.code === segments[1]);
    const newPath = hasLocale
      ? "/" + code + "/" + segments.slice(2).join("/")
      : "/" + code + pathname;
    router.push(newPath);
  }

  const currentLabel = LOCALES.find((l) => l.code === activeLocale)?.label ?? "English";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 text-[13px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-black/5 transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">{currentLabel}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 rounded-lg border border-border bg-background shadow-md z-50 py-1">
          {LOCALES.map((locale) => (
            <button
              key={locale.code}
              onClick={() => handleSwitch(locale.code)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-[13px] text-left hover:bg-black/5 transition-colors"
            >
              <span>{locale.label}</span>
              {activeLocale === locale.code && <Check className="w-3.5 h-3.5 text-foreground" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const segments = pathname.split('/');
  const locale = ['en','hi','de','fr','es','zh','ja'].includes(segments[1]) ? segments[1] : 'en';
  const [apiStatus, setApiStatus] = useState<"loading" | "ready" | "starting" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void getApiHealth(controller.signal)
      .then((health) => {
        if (cancelled) return;
        setApiStatus(health.status === "ok" && !health.db?.startsWith("error") ? "ready" : "starting");
      })
      .catch(() => {
        if (!cancelled) setApiStatus("unavailable");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong shadow-[0_1px_0_oklch(0_0_0/0.06)]"
    >
      <nav className="mx-auto max-w-6xl flex items-center justify-between h-12 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-foreground flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="4" r="2" fill="white" />
              <circle cx="4" cy="11" r="2" fill="white" opacity="0.6" />
              <circle cx="12" cy="11" r="2" fill="white" opacity="0.6" />
              <line x1="8" y1="6" x2="4" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="8" y1="6" x2="12" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
            </svg>
          </div>
          <span className="font-semibold text-[15px] tracking-[-0.01em] hidden sm:inline">Lumina</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard"
            className={cn(
              "text-[13px] transition-colors",
              pathname === "/dashboard" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("cases")}
          </Link>
          <Link href="/intake">
            <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85 px-3">
              {t("newCase")}
            </Button>
          </Link>
          <LanguageSwitcher />
          <div
            className="flex items-center gap-1.5"
            title={
              apiStatus === "ready"
                ? t("apiStatusReady")
                : apiStatus === "loading"
                  ? t("apiStatusLoading")
                  : apiStatus === "starting"
                    ? t("apiStatusStarting")
                    : t("apiStatusUnavailable")
            }
          >
            <div className={`w-2 h-2 rounded-full transition-colors flex-shrink-0 ${
              apiStatus === "ready" ? "bg-[oklch(0.52_0.19_160)]" : "bg-[oklch(0.75_0.15_60)]"
            } ${apiStatus === "loading" || apiStatus === "starting" ? "animate-pulse" : ""}`} />
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              {apiStatus === "ready"
                ? t("apiStatusReady")
                : apiStatus === "loading"
                  ? t("apiStatusLoading")
                  : apiStatus === "starting"
                    ? t("apiStatusStarting")
                    : t("apiStatusUnavailable")}
            </span>
          </div>
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Link
                label={t("docInfo")}
                labelIcon={<div className="w-4 h-4 flex items-center justify-center text-muted-foreground"><User className="w-3.5 h-3.5" /></div>}
                href="/settings/profile"
              />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </nav>
    </motion.header>
  );
}
