"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, UserCheck } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { setUserRoleAction, setUserStatusAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { useActionToast } from "./admin-controls";
import { cn } from "@/lib/utils/cn";

export function UserStatusControl({ userId, status }) {
  const t = useTranslations("admin.users");
  const tc = useTranslations("common");
  const router = useRouter();
  const check = useActionToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const next = status === "active" ? "suspended" : "active";

  const submit = async () => {
    setBusy(true);
    const res = await setUserStatusAction({ userId, status: next, reason }).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!check(res)) return;
    toast.success(t("statusUpdated"));
    setOpen(false);
    setReason("");
    router.refresh();
  };

  return (
    <>
      <Button variant={next === "suspended" ? "danger-outline" : "secondary"} size="sm" onClick={() => setOpen(true)}>
        {next === "suspended" ? <Ban className="h-4 w-4" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
        {next === "suspended" ? t("suspend") : t("reactivate")}
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={next === "suspended" ? t("suspendTitle") : t("reactivateTitle")}
        description={next === "suspended" ? t("suspendBody") : undefined}
        closeLabel={tc("close")}
      >
        <Field label={t("statusReason")}>
          {(a) => <Textarea {...a} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />}
        </Field>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{tc("cancel")}</Button>
          <Button variant={next === "suspended" ? "danger" : "primary"} onClick={submit} loading={busy} disabled={reason.trim().length < 4}>
            {next === "suspended" ? t("suspend") : t("reactivate")}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/** Role toggles. `manageable` lists roles this staff member may change (decided on the server). */
export function RoleControls({ userId, roles, manageable, disabled }) {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const check = useActionToast();
  const [busy, setBusy] = useState(null);

  const toggle = async (role) => {
    setBusy(role);
    const action = roles.includes(role) ? "revoke" : "grant";
    const res = await setUserRoleAction({ userId, role, action }).catch(() => ({ ok: false, error: "network" }));
    setBusy(null);
    if (!check(res)) return;
    toast.success(t("roleUpdated"));
    router.refresh();
  };

  return (
    <ul className="divide-y divide-line rounded-md border border-line">
      {["owner", "admin", "finance", "support"].map((role) => {
        const has = roles.includes(role);
        const can = !disabled && manageable.includes(role);
        return (
          <li key={role} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className={cn("text-sm", has ? "font-medium" : "text-ink-muted")}>{t(`roleNames.${role}`)}</span>
            <Button size="sm" variant={has ? "danger-outline" : "secondary"} disabled={!can} loading={busy === role} onClick={() => toggle(role)}>
              {has ? t("revoke") : t("grant")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
