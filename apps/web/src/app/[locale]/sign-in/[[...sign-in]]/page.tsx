"use client";

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="relative min-h-screen bg-white flex flex-col items-center justify-center overflow-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex items-center gap-2"
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-[12px] bg-foreground flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="4" r="2" fill="white" />
              <circle cx="4" cy="11" r="2" fill="white" opacity="0.6" />
              <circle cx="12" cy="11" r="2" fill="white" opacity="0.6" />
              <line x1="8" y1="6" x2="4" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
              <line x1="8" y1="6" x2="12" y2="9" stroke="white" strokeWidth="1.2" opacity="0.5" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">Lumina</span>
        </Link>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <SignIn />
      </motion.div>
    </div>
  );
}
