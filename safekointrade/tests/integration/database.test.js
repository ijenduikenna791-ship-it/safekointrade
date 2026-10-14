import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createDb, grantRole, signUp, uuid } from "./db-harness";

let db;
let alice; // regular user
let bob; // regular user
let fin; // finance reviewer
let owner;

const balance = async (id) =>
  (await db.query(`select available::text, held::text, invested::text from public.balances where user_id = $1`, [id])).rows[0];

const rpc = (user, sql, params = [], opts) => asUser(db, user, (tx) => tx.query(sql, params), opts);

const expectAppError = async (promise, code) => {
  await expect(promise).rejects.toThrow(new RegExp(`app:${code}`));
};

/** Funds a user the only legitimate way: deposit request + finance approval. */
async function fund(user, amount) {
  const { rows } = await rpc(user, `select * from public.request_deposit($1, 'USDT', 'crypto_transfer', 'tx-1', null, $2)`, [amount, uuid()]);
  await rpc(fin, `select * from public.review_deposit($1, 'approve', 'confirmed on-chain', null)`, [rows[0].id]);
  return rows[0];
}

beforeAll(async () => {
  db = await createDb();
  alice = await signUp(db, "alice@example.com", { full_name: "Alice A", username: "alice", phone: "+2348012345678", terms_accepted: true });
  bob = await signUp(db, "bob@example.com", { full_name: "Bob B", username: "bob" });
  fin = await signUp(db, "fin@example.com", { full_name: "Fin Reviewer", username: "fin" });
  owner = await signUp(db, "owner@example.com", { full_name: "Owner", username: "owner" });
  await grantRole(db, fin, "finance");
  await grantRole(db, owner, "owner");
}, 60_000);

describe("provisioning", () => {
  it("creates profile, balance and preferences for a new auth user", async () => {
    const p = (await db.query(`select username, phone, status, terms_accepted_at from public.profiles where id = $1`, [alice])).rows[0];
    expect(p).toMatchObject({ username: "alice", phone: "+2348012345678", status: "active" });
    expect(p.terms_accepted_at).not.toBeNull();
    expect(await balance(alice)).toEqual({ available: "0.00", held: "0.00", invested: "0.00" });
  });

  it("de-duplicates a username taken in a race instead of failing sign-up", async () => {
    const id = await signUp(db, "alice2@example.com", { username: "alice" });
    const { rows } = await db.query(`select username from public.profiles where id = $1`, [id]);
    expect(rows[0].username).toMatch(/^alice_[0-9a-f]{6}$/);
  });

  it("never grants a role from sign-up metadata", async () => {
    const id = await signUp(db, "sneaky@example.com", { username: "sneaky", role: "owner", roles: ["admin"] });
    const { rows } = await db.query(`select count(*)::int as n from public.user_roles where user_id = $1`, [id]);
    expect(rows[0].n).toBe(0);
  });

  it("reports username availability", async () => {
    const taken = await rpc(null, `select public.is_username_available('alice') as ok`, [], { role: "anon" });
    const free = await rpc(null, `select public.is_username_available('newname') as ok`, [], { role: "anon" });
    expect(taken.rows[0].ok).toBe(false);
    expect(free.rows[0].ok).toBe(true);
  });
});

describe("row level security and privileges", () => {
  it("users read only their own profile and balance", async () => {
    const { rows } = await rpc(alice, `select id from public.profiles`);
    expect(rows.map((r) => r.id)).toEqual([alice]);
    const b = await rpc(alice, `select user_id from public.balances`);
    expect(b.rows.map((r) => r.user_id)).toEqual([alice]);
  });

  it("users cannot write balances, ledger or roles directly", async () => {
    await expect(rpc(alice, `update public.balances set available = 1000000 where user_id = $1`, [alice])).rejects.toThrow(/permission denied/);
    await expect(
      rpc(alice, `insert into public.user_roles (user_id, role) values ($1, 'owner')`, [alice])
    ).rejects.toThrow(/permission denied/);
    await expect(
      rpc(alice, `insert into public.deposit_requests (user_id, amount, asset_symbol, method, idempotency_key, status) values ($1, 5, 'BTC', 'bank_transfer', $2, 'completed')`, [alice, uuid()])
    ).rejects.toThrow(/permission denied/);
  });

  it("users can edit only harmless profile columns", async () => {
    await rpc(alice, `update public.profiles set full_name = 'Alice Updated', theme = 'dark' where id = $1`, [alice]);
    await expect(rpc(alice, `update public.profiles set status = 'active', kyc_status = 'verified' where id = $1`, [alice])).rejects.toThrow(/permission denied/);
    // RLS: updating someone else's row silently matches nothing
    const r = await rpc(alice, `update public.profiles set full_name = 'Hacked' where id = $1`, [bob]);
    expect(r.affectedRows ?? 0).toBe(0);
  });

  it("anonymous visitors see only active plans and assets", async () => {
    const plans = await rpc(null, `select slug from public.investment_plans order by sort_order`, [], { role: "anon" });
    expect(plans.rows.map((r) => r.slug)).toEqual(["starter", "growth", "premium"]);
    await expect(rpc(null, `select * from public.profiles`, [], { role: "anon" })).rejects.toThrow(/permission denied/);
  });

  it("audit log is readable by owners only", async () => {
    const a = await rpc(alice, `select count(*)::int as n from public.audit_logs`);
    expect(a.rows[0].n).toBe(0);
    const o = await rpc(owner, `select count(*)::int as n from public.audit_logs`);
    expect(o.rows[0].n).toBeGreaterThanOrEqual(0);
  });
});

describe("deposits", () => {
  it("a request never changes the balance", async () => {
    await rpc(alice, `select * from public.request_deposit(250, 'BTC', 'crypto_transfer', 'abc', 'note', $1)`, [uuid()]);
    expect((await balance(alice)).available).toBe("0.00");
  });

  it("is idempotent for the same key", async () => {
    const key = uuid();
    const a = await rpc(alice, `select id from public.request_deposit(300, 'BTC', 'crypto_transfer', null, null, $1)`, [key]);
    const b = await rpc(alice, `select id from public.request_deposit(300, 'BTC', 'crypto_transfer', null, null, $1)`, [key]);
    expect(a.rows[0].id).toBe(b.rows[0].id);
  });

  it("rejects amounts below the minimum and unknown assets", async () => {
    await expectAppError(rpc(alice, `select public.request_deposit(1, 'BTC', 'crypto_transfer', null, null, $1)`, [uuid()]), "amount_below_min");
    await expectAppError(rpc(alice, `select public.request_deposit(100, 'DOGE', 'crypto_transfer', null, null, $1)`, [uuid()]), "asset_invalid");
    await expectAppError(rpc(alice, `select public.request_deposit(100.555, 'BTC', 'crypto_transfer', null, null, $1)`, [uuid()]), "amount_invalid");
  });

  it("only finance staff can approve, and approval credits exactly once", async () => {
    const { rows } = await rpc(bob, `select * from public.request_deposit(500, 'ETH', 'crypto_transfer', null, null, $1)`, [uuid()]);
    const id = rows[0].id;
    await expectAppError(rpc(alice, `select public.review_deposit($1, 'approve', null, null)`, [id]), "forbidden");
    await rpc(fin, `select public.review_deposit($1, 'approve', 'seen on chain', null)`, [id]);
    expect((await balance(bob)).available).toBe("500.00");
    await expectAppError(rpc(fin, `select public.review_deposit($1, 'approve', null, null)`, [id]), "invalid_status");
    expect((await balance(bob)).available).toBe("500.00");
  });

  it("can credit less than requested but never more", async () => {
    const { rows } = await rpc(bob, `select * from public.request_deposit(100, 'ETH', 'crypto_transfer', null, null, $1)`, [uuid()]);
    await expectAppError(rpc(fin, `select public.review_deposit($1, 'approve', null, 150)`, [rows[0].id]), "credit_exceeds_request");
    await rpc(fin, `select public.review_deposit($1, 'approve', 'partial', 90)`, [rows[0].id]);
    expect((await balance(bob)).available).toBe("590.00");
  });

  it("reviewers cannot approve their own deposits", async () => {
    const { rows } = await rpc(fin, `select * from public.request_deposit(100, 'ETH', 'crypto_transfer', null, null, $1)`, [uuid()]);
    await expectAppError(rpc(fin, `select public.review_deposit($1, 'approve', null, null)`, [rows[0].id]), "self_review_forbidden");
  });

  it("rejection requires a reason and credits nothing", async () => {
    const before = (await balance(bob)).available;
    const { rows } = await rpc(bob, `select * from public.request_deposit(100, 'ETH', 'crypto_transfer', null, null, $1)`, [uuid()]);
    await expectAppError(rpc(fin, `select public.review_deposit($1, 'reject', '', null)`, [rows[0].id]), "reason_required");
    await rpc(fin, `select public.review_deposit($1, 'reject', 'no matching transfer', null)`, [rows[0].id]);
    expect((await balance(bob)).available).toBe(before);
  });
});

describe("withdrawals", () => {
  let carol;
  beforeAll(async () => {
    carol = await signUp(db, "carol@example.com", { username: "carol" });
    await fund(carol, 1000);
  });

  it("refuses more than the available balance", async () => {
    await expectAppError(
      rpc(carol, `select public.request_withdrawal(60000, 'USDT', 'Tron', 'TXabcdefghijklmnop123', $1)`, [uuid()]),
      "amount_above_max"
    );
    await expectAppError(
      rpc(carol, `select public.request_withdrawal(1000.01, 'USDT', 'Tron', 'TXabcdefghijklmnop123', $1)`, [uuid()]),
      "insufficient_funds"
    );
  });

  it("holds funds on request, applies the fee, and is idempotent", async () => {
    const key = uuid();
    const a = await rpc(carol, `select * from public.request_withdrawal(200, 'USDT', 'Tron', 'TXabcdefghijklmnop123', $1)`, [key]);
    const b = await rpc(carol, `select * from public.request_withdrawal(200, 'USDT', 'Tron', 'TXabcdefghijklmnop123', $1)`, [key]);
    expect(a.rows[0].id).toBe(b.rows[0].id);
    // fee = 2 flat + 0.5% of 200 = 3.00
    expect(a.rows[0].fee).toBe("3.00");
    expect(a.rows[0].net_amount).toBe("197.00");
    expect(await balance(carol)).toEqual({ available: "800.00", held: "200.00", invested: "0.00" });
  });

  it("blocks an accidental double submit with a new key", async () => {
    await expectAppError(
      rpc(carol, `select public.request_withdrawal(200, 'USDT', 'Tron', 'TXabcdefghijklmnop123', $1)`, [uuid()]),
      "duplicate_request"
    );
  });

  it("can be cancelled by the user while pending, releasing funds", async () => {
    const { rows } = await rpc(carol, `select * from public.request_withdrawal(50, 'USDT', 'Tron', 'TXzzzzzzzzzzzzzzzz999', $1)`, [uuid()]);
    await rpc(carol, `select public.cancel_withdrawal($1)`, [rows[0].id]);
    expect(await balance(carol)).toEqual({ available: "800.00", held: "200.00", invested: "0.00" });
  });

  it("enforces the review state machine; completion needs a payout reference", async () => {
    const { rows } = await rpc(carol, `select id from public.withdrawal_requests where status = 'pending' and amount = 200`);
    const id = rows[0].id;
    await expectAppError(rpc(fin, `select public.review_withdrawal($1, 'complete', null, 'PAY-1')`, [id]), "invalid_status");
    await rpc(fin, `select public.review_withdrawal($1, 'approve', 'checks ok', null)`, [id]);
    await expectAppError(rpc(fin, `select public.review_withdrawal($1, 'complete', null, '')`, [id]), "payout_reference_required");
    await rpc(fin, `select public.review_withdrawal($1, 'complete', null, 'chain-tx-0xabc')`, [id]);
    expect(await balance(carol)).toEqual({ available: "800.00", held: "0.00", invested: "0.00" });
    await expectAppError(rpc(carol, `select public.cancel_withdrawal($1)`, [id]), "invalid_status");
  });

  it("rejection returns held funds", async () => {
    const { rows } = await rpc(carol, `select * from public.request_withdrawal(100, 'USDT', 'Tron', 'TXrejectrejectreject1', $1)`, [uuid()]);
    expect((await balance(carol)).held).toBe("100.00");
    await rpc(fin, `select public.review_withdrawal($1, 'reject', 'destination failed screening', null)`, [rows[0].id]);
    expect(await balance(carol)).toEqual({ available: "800.00", held: "0.00", invested: "0.00" });
  });
});

describe("investments", () => {
  let dave;
  let growth;
  beforeAll(async () => {
    dave = await signUp(db, "dave@example.com", { username: "dave" });
    await fund(dave, 5000);
    growth = (await db.query(`select id from public.investment_plans where slug = 'growth'`)).rows[0].id;
  });

  it("enforces plan range and available balance", async () => {
    await expectAppError(rpc(dave, `select public.create_investment($1, 500, $2)`, [growth, uuid()]), "amount_below_min");
    await expectAppError(rpc(dave, `select public.create_investment($1, 10000, $2)`, [growth, uuid()]), "amount_above_max");
  });

  it("moves funds from available to invested and snapshots the term", async () => {
    const { rows } = await rpc(dave, `select * from public.create_investment($1, 3000, $2)`, [growth, uuid()]);
    expect(rows[0]).toMatchObject({ status: "active", term_days: 90, plan_name: "Growth" });
    expect(await balance(dave)).toEqual({ available: "2000.00", held: "0.00", invested: "3000.00" });
    await expectAppError(rpc(dave, `select public.create_investment($1, 2500, $2)`, [growth, uuid()]), "insufficient_funds");
  });

  it("can be cancelled within 24 hours, returning principal", async () => {
    const { rows } = await rpc(dave, `select * from public.create_investment($1, 1000, $2)`, [growth, uuid()]);
    await rpc(dave, `select public.cancel_investment($1)`, [rows[0].id]);
    expect(await balance(dave)).toEqual({ available: "2000.00", held: "0.00", invested: "3000.00" });
  });

  it("cannot be cancelled after 24 hours", async () => {
    const { rows } = await rpc(dave, `select * from public.create_investment($1, 1000, $2)`, [growth, uuid()]);
    await db.query(`update public.investments set started_at = now() - interval '25 hours' where id = $1`, [rows[0].id]);
    await expectAppError(rpc(dave, `select public.cancel_investment($1)`, [rows[0].id]), "cancel_window_closed");
  });

  it("matures to principal only — never credits profit", async () => {
    await db.query(`update public.investments set matures_at = now() - interval '1 minute' where user_id = $1 and status = 'active'`, [dave]);
    const { rows } = await rpc(dave, `select public.mature_my_investments() as n`);
    expect(rows[0].n).toBe(2);
    expect(await balance(dave)).toEqual({ available: "5000.00", held: "0.00", invested: "0.00" });
    const again = await rpc(dave, `select public.mature_my_investments() as n`);
    expect(again.rows[0].n).toBe(0);
  });

  it("regular users cannot run batch maturity", async () => {
    await expectAppError(rpc(dave, `select public.process_matured_investments(10)`), "forbidden");
  });
});

describe("ledger integrity", () => {
  it("every balance equals the sum of its ledger deltas", async () => {
    const { rows } = await db.query(`
      select b.user_id, b.available, b.held, b.invested,
             coalesce(sum(t.delta_available), 0)::numeric(20,2) as la,
             coalesce(sum(t.delta_held), 0)::numeric(20,2) as lh,
             coalesce(sum(t.delta_invested), 0)::numeric(20,2) as li
        from public.balances b left join public.transactions t on t.user_id = b.user_id
       group by b.user_id`);
    for (const r of rows) {
      expect(r.available).toBe(r.la);
      expect(r.held).toBe(r.lh);
      expect(r.invested).toBe(r.li);
    }
  });

  it("ledger and audit rows are append-only, even for the service role", async () => {
    await expect(db.query(`update public.transactions set amount = 1`)).rejects.toThrow(/append-only/);
    await expect(db.query(`delete from public.audit_logs`)).rejects.toThrow(/append-only/);
  });
});

describe("staff controls", () => {
  it("staff with an enrolled authenticator must use it (aal2)", async () => {
    await db.query(`insert into auth.mfa_factors (user_id, status) values ($1, 'verified')`, [fin]);
    const { rows } = await rpc(bob, `select * from public.request_deposit(100, 'ETH', 'crypto_transfer', null, null, $1)`, [uuid()]);
    await expectAppError(rpc(fin, `select public.review_deposit($1, 'approve', null, null)`, [rows[0].id]), "mfa_required");
    await rpc(fin, `select public.review_deposit($1, 'approve', null, null)`, [rows[0].id], { aal: "aal2" });
  });

  it("finance staff cannot manage roles; owners can, but not their own", async () => {
    await expectAppError(rpc(fin, `select public.set_user_role($1, 'support', 'grant')`, [bob], { aal: "aal2" }), "forbidden");
    await rpc(owner, `select public.set_user_role($1, 'support', 'grant')`, [bob]);
    await expectAppError(rpc(owner, `select public.set_user_role($1, 'admin', 'grant')`, [owner]), "self_action_forbidden");
    await expectAppError(rpc(owner, `select public.set_user_role($1, 'owner', 'revoke')`, [owner]), "self_action_forbidden");
  });

  it("suspended users cannot move money", async () => {
    await rpc(owner, `select public.set_user_status($1, 'suspended', 'fraud review')`, [alice]);
    await expectAppError(rpc(alice, `select public.request_deposit(100, 'BTC', 'crypto_transfer', null, null, $1)`, [uuid()]), "account_suspended");
    await rpc(owner, `select public.set_user_status($1, 'active', 'review cleared')`, [alice]);
  });

  it("plan return targets require a published basis", async () => {
    const plan = {
      slug: "test-plan", name: "Test", description: "A test plan for validation", min_amount: "10", max_amount: "20",
      term_days: 10, risk_level: "low", risk_description: "Test risk description", target_return_min: "1", target_return_max: "2",
    };
    await expectAppError(rpc(owner, `select public.upsert_plan($1)`, [JSON.stringify(plan)]), "plan_invalid");
    await rpc(owner, `select public.upsert_plan($1)`, [JSON.stringify({ ...plan, target_return_basis: "Historical average of the reference index over five years" })]);
  });

  it("every staff action is audited", async () => {
    const { rows } = await db.query(`select action from public.audit_logs where action in ('deposit.approve','role.grant','user.suspended','plan.created')`);
    const actions = new Set(rows.map((r) => r.action));
    expect([...actions].sort()).toEqual(["deposit.approve", "plan.created", "role.grant", "user.suspended"]);
  });

  it("admin overview is computed from records and requires a staff role", async () => {
    await expectAppError(rpc(alice, `select public.admin_overview()`), "forbidden");
    const { rows } = await rpc(owner, `select public.admin_overview() as o`);
    expect(rows[0].o.users_total).toBeGreaterThanOrEqual(6);
  });
});

describe("newsletter and rate limiting", () => {
  it("stores consent and reports duplicates", async () => {
    const a = await rpc(null, `select public.subscribe_newsletter('News@Example.com', 'en', 'consent text') as r`, [], { role: "anon" });
    const b = await rpc(null, `select public.subscribe_newsletter('news@example.com', 'en', 'consent text') as r`, [], { role: "anon" });
    expect([a.rows[0].r, b.rows[0].r]).toEqual(["subscribed", "already"]);
  });

  it("rate limiter is service-role only and counts per window", async () => {
    await expect(rpc(alice, `select public.check_rate_limit('k', 2, 60)`)).rejects.toThrow(/permission denied/);
    const results = [];
    for (let i = 0; i < 3; i++) {
      const { rows } = await rpc(null, `select public.check_rate_limit('k', 2, 60) as ok`, [], { role: "service_role" });
      results.push(rows[0].ok);
    }
    expect(results).toEqual([true, true, false]);
  });
});

describe("function exposure", () => {
  // Any new function reachable by clients must be added here deliberately.
  const ANON = ["has_any_role", "is_staff", "is_username_available", "subscribe_newsletter", "unsubscribe_newsletter"].sort();
  const AUTHENTICATED = [
    ...ANON, "admin_daily_flows", "admin_overview", "attach_deposit_receipt", "cancel_investment", "cancel_withdrawal",
    "close_ticket", "create_investment", "create_support_ticket", "current_roles", "mark_all_notifications_read",
    "mature_my_investments", "meets_mfa", "process_matured_investments", "reply_to_ticket", "request_deposit",
    "request_withdrawal", "review_deposit", "review_withdrawal", "send_announcement", "set_asset_flags",
    "set_ticket_status", "set_user_role", "set_user_status", "update_setting", "upsert_plan", "withdrawal_fee",
  ].sort();

  const executable = async (role) =>
    (
      await db.query(
        `select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege($1, p.oid, 'execute')
            and p.prorettype <> 'trigger'::regtype
          order by 1`,
        [role]
      )
    ).rows.map((r) => r.proname);

  // Trigger functions and the plain helpers below are harmless to call.
  const harmless = ["make_reference", "prevent_mutation", "reset_phone_verification", "set_updated_at"];

  it("anon can execute only the public allowlist", async () => {
    expect((await executable("anon")).filter((f) => !harmless.includes(f))).toEqual(ANON);
  });

  it("authenticated can execute only the user/staff allowlist", async () => {
    expect((await executable("authenticated")).filter((f) => !harmless.includes(f))).toEqual(AUTHENTICATED);
  });
});
