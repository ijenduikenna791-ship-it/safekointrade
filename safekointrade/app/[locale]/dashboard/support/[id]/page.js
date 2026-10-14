import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { getViewer } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { TicketThread } from "@/components/dashboard/ticket-thread";
import { TicketReply } from "@/components/dashboard/support-forms";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

export default async function TicketPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await getTranslations("dashboard.support");
  const tc = await getTranslations("common");
  const { supabase } = await getViewer();

  // RLS: only the ticket owner (or support staff) can read it.
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase.from("support_tickets").select("id, reference, subject, category, status").eq("id", id).maybeSingle(),
    supabase.from("support_messages").select("id, body, is_staff, created_at").eq("ticket_id", id).order("created_at"),
  ]);
  if (!ticket) notFound();

  return (
    <>
      <PageHeader
        title={ticket.subject}
        description={`${ticket.reference} · ${t(`categories.${ticket.category}`)}`}
        actions={
          <>
            <StatusBadge status={ticket.status} label={tc(`status.${ticket.status}`)} />
            <Link href="/dashboard/support" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <ArrowLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
              {t("back")}
            </Link>
          </>
        }
      />
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <TicketThread messages={messages || []} perspective="user" />
        <TicketReply ticketId={ticket.id} closed={ticket.status === "closed"} />
      </Card>
    </>
  );
}
