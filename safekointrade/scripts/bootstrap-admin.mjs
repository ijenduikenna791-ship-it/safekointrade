#!/usr/bin/env node
/**
 * One-time bootstrap: promote an existing, email-confirmed account to OWNER.
 *
 *   1. Sign up normally through the app (or create the user in the Supabase
 *      dashboard) with YOUR OWN email and a strong password, and confirm it.
 *   2. Put a long random ADMIN_BOOTSTRAP_TOKEN in .env.local
 *      (e.g. `openssl rand -hex 32`).
 *   3. Run:  npm run bootstrap:admin -- --email you@yourdomain.com --token <same token>
 *   4. Remove ADMIN_BOOTSTRAP_TOKEN from .env.local afterwards.
 *
 * Safety:
 *   - runs only on a trusted machine with the service-role key; never in the browser
 *   - refuses to run once ANY owner exists (the bootstrap closes itself)
 *   - never creates or prints passwords
 *   - writes an audit log entry
 * Further staff are granted by an owner from /admin/users.
 */
import { createClient } from "@supabase/supabase-js";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
const email = (arg("email") || "").trim().toLowerCase();
const token = arg("token");

// --- environment validation -------------------------------------------------------
if (!url || !/^https:\/\/.+/.test(url)) fail("NEXT_PUBLIC_SUPABASE_URL is missing or not an https URL.");
if (!serviceKey) fail("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is missing.");
if (!expectedToken || expectedToken.length < 32) fail("ADMIN_BOOTSTRAP_TOKEN must be set to at least 32 random characters.");
if (!token || token !== expectedToken) fail("Pass --token matching ADMIN_BOOTSTRAP_TOKEN.");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Pass --email with the address of the account to promote.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// --- bootstrap closes once an owner exists ----------------------------------------
const { count: owners, error: ownerErr } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "owner");
if (ownerErr) fail(`Couldn't read roles — have the migrations been applied? (${ownerErr.message})`);
if (owners > 0) fail("An owner already exists. Bootstrap is closed; grant roles from /admin/users instead.");

// --- find the confirmed auth user ------------------------------------------------
let user = null;
for (let page = 1; page <= 50 && !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail(`Couldn't list users: ${error.message}`);
  user = data.users.find((u) => u.email?.toLowerCase() === email) || null;
  if (data.users.length < 200) break;
}
if (!user) fail(`No account found for ${email}. Sign up through the app first, then confirm the email.`);
if (!user.email_confirmed_at) fail(`${email} hasn't confirmed its email address yet.`);

// --- grant owner -------------------------------------------------------------------
const { error: grantErr } = await admin.from("user_roles").insert({ user_id: user.id, role: "owner", granted_by: null });
if (grantErr) fail(`Couldn't grant the owner role: ${grantErr.message}`);
await admin.from("audit_logs").insert({
  actor_id: null,
  actor_roles: ["system"],
  action: "role.bootstrap_owner",
  entity_type: "profile",
  entity_id: user.id,
  details: { email, via: "scripts/bootstrap-admin.mjs" },
});

console.log(`\n✔ ${email} is now an owner.`);
console.log("  Next: sign in at /admin/login, then enable two-step sign-in under Settings → Security.");
console.log("  Remove ADMIN_BOOTSTRAP_TOKEN from your environment — this script won't run again.\n");
