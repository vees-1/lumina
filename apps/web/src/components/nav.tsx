"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#modalities", label: "Technology" },
  { href: "#stats", label: "Science" },
];

export function Nav({ transparent = false }: { transparent?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { isSignedIn } = useAuth();

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
          <div className="flex items-center gap-2">
            {!isSignedIn ? (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" className="text-[13px] h-7">
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85">
                    Get started
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {!pathname.startsWith("/dashboard") ? (
                  <Link href="/dashboard">
                    <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/intake">
                    <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85">
                      New case
                    </Button>
                  </Link>
                )}
                <UserButton />
              </>
            )}
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 glass-strong md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <div className="flex flex-col gap-2 p-6 pt-20">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-lg font-medium py-2" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
  { code: "ta", label: "த" },
] as const;

function LanguageSwitcher() {
  const [current, setCurrent] = useState<string>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("lumina_locale") ?? "en") : "en"
  );

  function handleSwitch(code: string) {
    if (code === current) return;
    localStorage.setItem("lumina_locale", code);
    setCurrent(code);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-0.5">
      {LOCALES.map((locale, i) => (
        <button
          key={locale.code}
          onClick={() => handleSwitch(locale.code)}
          className={cn(
            "px-2 py-0.5 text-[11px] rounded transition-colors",
            current === locale.code
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground",
            i < LOCALES.length - 1 && "border-r border-border"
          )}
        >
          {locale.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong shadow-[0_1px_0_oklch(0_0_0/0.06)]"
    >
      <nav className="mx-auto max-w-6xl flex items-center justify-between h-12 px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-foreground flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="4" r="2" fill="white" />
              <circle cx="4" cy="11" r="2" fill="white" opacity="0.6" />
              <circle cx="12" cy="11" r="2" fill="white" opacity="0.6" />
              <line x1="8" y1="6" x2="4" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="8" y1="6" x2="12" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
            </svg>
          </div>
          <span className="font-semibold text-[15px] tracking-[-0.01em]">Lumina</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={cn(
              "text-[13px] transition-colors",
              pathname === "/dashboard" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Cases
          </Link>
          <Link href="/intake">
            <Button size="sm" className="text-[13px] h-7 rounded-full bg-foreground text-background hover:bg-foreground/85">
              New case
            </Button>
          </Link>
          <LanguageSwitcher />
          <UserButton />
        </div>
      </nav>
    </motion.header>
  );
}
