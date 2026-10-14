import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { requireStaff } from "@/lib/authorization/guards";
import { PageHeader } from "@/components/dashboard/page-header";
import { TicketThread } from "@/components/dashboard/ticket-thread";
import { TicketReply } from "@/components/dashboard/support-forms";
import { TicketStatusControl } from "@/components/admin/ticket-status";
import { Card, CardBody } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

export default async function AdminTicketPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const staff = await requireStaff("support.manage", `/admin/support/${id}`);
  const ts = await getTranslations("dashboard.support");
  const tn = await getTranslations("admin.nav");
  const tas = await getTranslations("admin.support");
  const [{ data: ticket }, { data: messages }] = await Promise.all([
    staff.supabase.from("support_tickets").select("id, reference, subject, category, status, priority, user:profiles!support_tickets_user_id_fkey(id, email, full_name)").eq("id", id).maybeSingle(),
    staff.supabase.from("support_messages").select("id, body, is_staff, created_at").eq("ticket_id", id).order("created_at"),
  ]);
  if (!ticket) notFound();

  return (
    <>
      <PageHeader
        title={ticket.subject}
        description={`${ticket.reference} · ${ts(`categories.${ticket.category}`)}`}
        actions={
          <Link href="/admin/support" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowLeft className="h-4 w-4 rtl-flip" aria-hidden="true" />
            {tn("support")}
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
        <Card className="overflow-hidden">
          <TicketThread messages={(messages || []).map((m) => ({ ...m, author_name: ticket.user?.full_name }))} perspective="staff" />
          {/* Staff can always reply; the database records it as a staff message. */}
          <TicketReply ticketId={ticket.id} closed={false} canClose={false} />
        </Card>
        <Card className="self-start">
          <CardBody className="space-y-4">
            <div>
              <p className="text-xs text-ink-subtle">{tas("customer")}</p>
              <Link href={`/admin/users/${ticket.user?.id}`} className="font-medium hover:text-brass">{ticket.user?.full_name || ticket.user?.email}</Link>
              <p className="text-sm text-ink-muted">{ticket.user?.email}</p>
            </div>
            <TicketStatusControl id={ticket.id} status={ticket.status} priority={ticket.priority} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
