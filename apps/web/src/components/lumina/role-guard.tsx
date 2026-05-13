"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RoleGuard({ allowed, redirectTo, children }: { allowed: string[], redirectTo: string, children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      let role = user?.publicMetadata?.role as string;
      if (!role && typeof window !== "undefined") {
        const saved = window.localStorage.getItem("lumina_user_role");
        role = saved === "patient" ? "patient" : "doctor";
      }
      
      if (!role || !allowed.includes(role)) {
        router.push(redirectTo);
      }
    }
  }, [user, isLoaded, allowed, redirectTo, router]);

  if (!isLoaded) {
    return null;
  }

  let role = user?.publicMetadata?.role as string;
  if (!role && typeof window !== "undefined") {
    const saved = window.localStorage.getItem("lumina_user_role");
    role = saved === "patient" ? "patient" : "doctor";
  }

  if (!role || !allowed.includes(role)) {
    return null;
  }

  return <>{children}</>;
}