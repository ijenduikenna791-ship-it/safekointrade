/**
 * In-process Postgres (PGlite) with the minimum of Supabase's environment
 * stubbed: roles anon/authenticated/service_role, auth.uid()/auth.jwt(),
 * auth.users, auth.mfa_factors and storage. The real migrations then run
 * unchanged, so these tests exercise the actual SQL, RLS and functions.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const ROOT = join(import.meta.dirname, "..", "..", "supabase");

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create table auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
-- Supabase's default privileges on the public schema:
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export async function createDb({ seed = true } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(join(ROOT, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    try {
      await db.exec(readFileSync(join(ROOT, "migrations", f), "utf8"));
    } catch (e) {
      throw new Error(`Migration ${f} failed: ${e.message}`);
    }
  }
  // service_role gets everything (as in Supabase)
  await db.exec(`grant all on all tables in schema public to service_role;`);
  if (seed) await db.exec(readFileSync(join(ROOT, "seed.sql"), "utf8"));
  return db;
}

/** Creates an auth user (fires the provisioning trigger). Returns its id. */
export async function signUp(db, email, meta = {}) {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify(meta)]
  );
  return rows[0].id;
}

/**
 * Runs `fn` as a given user, inside a transaction with the request settings
 * Supabase would set from the JWT. role: 'authenticated' | 'anon' | 'service_role'.
 */
export async function asUser(db, userId, fn, { role = "authenticated", aal = "aal1" } = {}) {
  return db.transaction(async (tx) => {
    const claims = JSON.stringify(userId ? { sub: userId, role, aal } : { role });
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`, [
      userId ?? "",
      claims,
    ]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}

/** Grants a role directly (simulates the server-only bootstrap script). */
export async function grantRole(db, userId, role) {
  await db.query(`insert into public.user_roles (user_id, role) values ($1, $2)`, [userId, role]);
}

export const uuid = () => crypto.randomUUID();
