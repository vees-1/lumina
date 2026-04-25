import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/:locale/dashboard(.*)",
  "/:locale/intake(.*)",
  "/:locale/case(.*)",
  "/dashboard(.*)",
  "/intake(.*)",
  "/case(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const intlResponse = intlMiddleware(req);
  if (intlResponse) return intlResponse;
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
