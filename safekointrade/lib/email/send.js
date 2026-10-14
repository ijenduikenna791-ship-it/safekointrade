import "server-only";
import { Resend } from "resend";
import { brand } from "@/lib/config/brand";

let client;
function resend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

const escape = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function layout({ title, body, cta }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `<!doctype html><html><body style="margin:0;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#0f1e26">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #d8e0dd;border-radius:12px">
<tr><td style="padding:28px 32px 8px;font-size:18px;font-weight:bold">${escape(brand.name)}</td></tr>
<tr><td style="padding:8px 32px 0;font-size:20px;font-weight:bold">${escape(title)}</td></tr>
<tr><td style="padding:12px 32px 8px;font-size:15px;line-height:1.6;color:#4a5b62">${body}</td></tr>
${cta ? `<tr><td style="padding:16px 32px 8px"><a href="${appUrl}${cta.href}" style="display:inline-block;background:#0f1e26;color:#f4f6f5;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px">${escape(cta.label)}</a></td></tr>` : ""}
${brand.demoMode ? `<tr><td style="padding:16px 32px 0;font-size:12px;color:#8a6524">Demo mode: amounts are simulated. No real funds were moved.</td></tr>` : ""}
<tr><td style="padding:20px 32px 28px;font-size:12px;color:#6f8086">You're receiving this because of activity on your ${escape(brand.name)} account. Manage email preferences in Settings → Notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Sends a transactional email. Never throws — email failure must not undo a
 * completed financial operation. Without RESEND_API_KEY, logs and skips.
 */
export async function sendEmail({ to, subject, title, text, cta }) {
  if (!to) return { skipped: true };
  const r = resend();
  if (!r || !process.env.EMAIL_FROM) {
    console.info(`[email:skipped] to=${to} subject="${subject}" (RESEND_API_KEY/EMAIL_FROM not set)`);
    return { skipped: true };
  }
  try {
    const { error } = await r.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject: `${subject} · ${brand.name}`,
      html: layout({ title: title || subject, body: escape(text).replace(/\n/g, "<br>"), cta }),
      text: `${title || subject}\n\n${text}${cta ? `\n\n${cta.label}: ${process.env.NEXT_PUBLIC_APP_URL || ""}${cta.href}` : ""}`,
    });
    if (error) console.error("[email:error]", error.message);
    return { sent: !error };
  } catch (e) {
    console.error("[email:error]", e?.message);
    return { sent: false };
  }
}

/**
 * Sends an event email if the user's preferences allow it. Uses the caller's
 * Supabase client, so RLS decides whether the preferences/email are readable.
 */
export async function notifyByEmail(supabase, userId, category, message) {
  try {
    const [{ data: prefs }, { data: profile }] = await Promise.all([
      supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("email").eq("id", userId).maybeSingle(),
    ]);
    if (!profile?.email) return;
    const key = `email_${category}`;
    if (prefs && prefs[key] === false) return;
    await sendEmail({ to: profile.email, ...message });
  } catch (e) {
    console.error("[email:notify]", e?.message);
  }
}
