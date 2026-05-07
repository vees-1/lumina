"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Check, Menu, X } from "lucide-react";
import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LuminaLogo } from "@/components/lumina/practo-ui";
import { getApiHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
] as const;

const clinicLinks = [
  { label: "Doctor Dashboard", href: "/dashboard" },
  { label: "Patient Pre-Intake", href: "/patient" },
  { label: "Clinical Reviewer", href: "/clinical-reviewer" },
  { label: "Doctor Profile", href: "/settings/profile" },
];

const providerLinks = [
  { label: "Referral Letters", href: "/referral-letters" },
  { label: "HPO Workflow", href: "/hpo-workflow" },
  { label: "Rare Disease Scoring", href: "/rare-disease-scoring" },
  { label: "FHIR Export", href: "/fhir-export" },
];

const securityLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
];

function useLocalePath() {
  const pathname = usePathname();
  const first = pathname.split("/")[1];
  const locale = LOCALES.some((item) => item.code === first) ? first : "en";

  return (href: string) => {
    if (href.startsWith("#")) return href;
    return `/${locale}${href === "/" ? "" : href}`;
  };
}

function Dropdown({
  label,
  items,
  badge,
}: {
  label: string;
  items: Array<{ label: string; href: string; disabled?: boolean }>;
  badge?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toLocalePath = useLocalePath();

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-1.5 text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]"
      >
        {badge && <span className="rounded-full bg-[#283691] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">{badge}</span>}
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-64 -translate-x-1/2 rounded-sm border border-[#edf0f5] bg-white py-3 shadow-[0_6px_24px_rgba(0,0,0,0.14)]">
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#edf0f5] bg-white" />
          {items.map((item) => (
            <Link
              key={item.label}
              href={toLocalePath(item.href)}
              onClick={() => setOpen(false)}
              className={cn(
                "block px-6 py-3 text-[14px] text-[#454851] transition-colors hover:bg-[#f7f9fc] hover:text-[#2536a0]",
                item.disabled && "pointer-events-none text-[#9aa1af]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageDropdown() {
  const pathname = usePathname();
  const router = useRouter();
  const current = pathname.split("/")[1];
  const activeLocale = LOCALES.find((item) => item.code === current)?.code ?? "en";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function switchLocale(code: string) {
    const segments = pathname.split("/");
    const hasLocale = LOCALES.some((item) => item.code === segments[1]);
    const next = hasLocale ? `/${code}/${segments.slice(2).join("/")}` : `/${code}${pathname}`;
    router.push(next.replace(/\/$/, "") || `/${code}`);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-1.5 text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]"
      >
        Language
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-48 -translate-x-1/2 rounded-sm border border-[#edf0f5] bg-white py-3 shadow-[0_6px_24px_rgba(0,0,0,0.14)]">
          <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#edf0f5] bg-white" />
          {LOCALES.map((locale) => (
            <button
              key={locale.code}
              type="button"
              onClick={() => switchLocale(locale.code)}
              className="flex w-full items-center justify-between px-6 py-2.5 text-left text-[14px] text-[#454851] transition-colors hover:bg-[#f7f9fc] hover:text-[#2536a0]"
            >
              {locale.label}
              {activeLocale === locale.code && <Check className="h-4 w-4 text-[#38b6e8]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nav({ transparent = false }: { transparent?: boolean } = {}) {
  void transparent;
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const toLocalePath = useLocalePath();
  const [storedRole] = useState<"doctor" | "patient">(() => {
    if (typeof window === "undefined") return "doctor";
    const saved = window.localStorage.getItem("lumina_user_role");
    return saved === "patient" ? "patient" : "doctor";
  });
  const role = typeof user?.publicMetadata?.role === "string" ? user.publicMetadata.role : storedRole;
  const workspaceHref = role === "patient" ? "/patient" : "/dashboard";
  const [apiReady, setApiReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    getApiHealth()
      .then(() => {
        if (!cancelled) setApiReady(true);
      })
      .catch(() => {
        if (!cancelled) setApiReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#edf0f5] bg-white">
      <nav className="mx-auto flex h-[74px] max-w-6xl items-center justify-between px-6">
        <div className="flex shrink-0 items-center gap-3">
          <Link href={toLocalePath("/")} className="flex items-center">
            <LuminaLogo />
          </Link>
        </div>

        <div className="hidden items-center gap-7 md:flex">
          {!isSignedIn ? (
            <>
              <Dropdown label="For Clinics" badge="NEW" items={clinicLinks} />
              <Dropdown label="For Providers" items={providerLinks} />
              <Dropdown label="Security & Help" items={securityLinks} />
              <LanguageDropdown />
            </>
          ) : role === "patient" ? (
            <>
              <Link href={toLocalePath("/patient")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                Patient Dashboard
              </Link>
              <Link href={toLocalePath("/patient/submissions")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                Submissions
              </Link>
              <Link href={toLocalePath("/patient/new")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                New submission
              </Link>
              <Link href={toLocalePath("/patient/reports")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                Reports
              </Link>
              <LanguageDropdown />
            </>
          ) : (
            <>
              <Link href={toLocalePath("/dashboard")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                Doctor Dashboard
              </Link>
              <Link href={toLocalePath("/cases")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                Cases
              </Link>
              <Link href={toLocalePath("/new-case")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                New case
              </Link>
              <Link href={toLocalePath("/results")} className="inline-flex h-10 items-center text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                Results
              </Link>
              <LanguageDropdown />
            </>
          )}

          {!isSignedIn ? (
            <Link href={toLocalePath("/sign-in")}>
              <Button variant="outline" className="h-10 rounded border-[#cfd5e2] px-4 text-[14px] font-medium text-[#555b68]">
                Login / Signup
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <Link href={toLocalePath(workspaceHref)} className="inline-flex h-10 items-center gap-2 text-[14px] font-medium text-[#33343b] transition-colors hover:text-[#2536a0]">
                <span className={cn("h-2.5 w-2.5 rounded-full", apiReady === false ? "bg-red-500" : "bg-emerald-500")} />
                {apiReady === false ? "API unavailable" : "API ready"}
              </Link>
              <UserButton />
            </div>
          )}
        </div>

        <button type="button" className="md:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-[#edf0f5] bg-white px-6 py-4 md:hidden">
          {(isSignedIn
            ? role === "patient"
              ? [
                  { label: "Patient Dashboard", href: "/patient" },
                  { label: "Submissions", href: "/patient/submissions" },
                  { label: "New submission", href: "/patient/new" },
                  { label: "Reports", href: "/patient/reports" },
                ]
              : [
                  { label: "Doctor Dashboard", href: "/dashboard" },
                  { label: "Cases", href: "/cases" },
                  { label: "New case", href: "/new-case" },
                  { label: "Results", href: "/results" },
                ]
            : [...clinicLinks, ...providerLinks, ...securityLinks]
          ).map((item) => (
            <Link key={item.label} href={toLocalePath(item.href)} className="block py-3 text-[15px] font-semibold text-[#343741]" onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href={toLocalePath(isSignedIn ? "/dashboard" : "/sign-in")} onClick={() => setMobileOpen(false)}>
            <Button className="mt-3 h-11 w-full rounded bg-[#38b6e8] font-bold text-white">
              {isSignedIn ? "Dashboard" : "Login / Signup"}
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}

export function DashboardNav() {
  return <Nav />;
}
