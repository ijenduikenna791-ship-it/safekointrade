import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing, locales } from "@/lib/i18n/routing";
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY, isSupabaseConfigured } from "@/lib/supabase/env";

const intlMiddleware = createIntlMiddleware(routing);

const localePattern = new RegExp(`^/(${locales.join("|")})(?=/|$)`);

function stripLocale(pathname) {
  const match = pathname.match(localePattern);
  return {
    locale: match ? match[1] : routing.defaultLocale,
    path: match ? pathname.slice(match[0].length) || "/" : pathname,
  };
}

/**
 * Runs before every page request:
 *  1. resolves the locale (next-intl)
 *  2. refreshes the Supabase session cookie
 *  3. redirects signed-out visitors away from private areas
 *
 * This is an optimistic gate only. Real authorization happens again on the
 * server in every layout, Server Action and Route Handler (lib/authorization),
 * and in the database through Row Level Security.
 */
export async function proxy(request) {
  const response = intlMiddleware(request);

  // next-intl may answer with a redirect (e.g. adding a locale) — honour it.
  if (response.headers.get("location")) return response;
  const { locale, path } = stripLocale(request.nextUrl.pathname);
  const isDashboard = path === "/dashboard" || path.startsWith("/dashboard/");
  const isAdmin = (path === "/admin" || path.startsWith("/admin/")) && path !== "/admin/login";
  const isPrivate = isDashboard || isAdmin;

  // Without a backend nobody can be signed in, so private areas always redirect.
  if (!isSupabaseConfigured()) return isPrivate ? redirectToLogin(request, response, { locale, path, isAdmin }) : response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims() validates the JWT signature; do not replace with getSession().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && isPrivate) return redirectToLogin(request, response, { locale, path, isAdmin });

  return response;
}

function redirectToLogin(request, response, { locale, path, isAdmin }) {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const url = request.nextUrl.clone();
  url.pathname = `${prefix}${isAdmin ? "/admin/login" : "/login"}`;
  url.search = "";
  url.searchParams.set("next", path);
  const redirect = NextResponse.redirect(url);
  // Carry over any refreshed session / locale cookies.
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
