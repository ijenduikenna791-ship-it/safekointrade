import { CryptoCoin } from "@/components/ui/crypto-coin";
import { getLocale, getTranslations } from "next-intl/server";
import { getPrices } from "@/lib/market/coingecko";
import { getPublicAssets } from "@/lib/database/public-data";
import { SectionHeading } from "./section-heading";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export async function SupportedAssets({ assets }) {
  const t = await getTranslations("home.assets");
  const locale = await getLocale();
  const prices = await getPrices(assets.map((a) => a.coingecko_id).filter(Boolean));

  return (
    <section aria-labelledby="assets-title" className="container-page py-16 sm:py-24">
      <SectionHeading id="assets-title" title={t("title")} body={t("body")} />
      <div className="mt-10 overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-ink-subtle">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-medium sm:px-6">{t("title")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium md:table-cell">{t("network")}</th>
              <th scope="col" className="px-4 py-3 text-end font-medium">{t("price")}</th>
              <th scope="col" className="px-4 py-3 text-end font-medium sm:px-6">{t("change24h")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {assets.map((a) => {
              const p = prices?.[a.coingecko_id];
              const change = p?.usd_24h_change;
              return (
                <tr key={a.symbol}>
                  <th scope="row" className="px-4 py-3.5 text-start font-normal sm:px-6">
                    <span className="flex items-center gap-3">
                      <CryptoCoin symbol={a.symbol} className="h-9 w-9 shrink-0" />
                      <span>
                        <span className="block font-medium text-ink">{a.name}</span>
                        <span className="block text-xs text-ink-subtle">{a.symbol}</span>
                      </span>
                    </span>
                  </th>
                  <td className="hidden px-4 py-3.5 text-ink-muted md:table-cell">{a.network}</td>
                  <td className="tabular px-4 py-3.5 text-end">{p?.usd != null ? formatMoney(p.usd, { locale }) : t("noPrice")}</td>
                  <td
                    className={cn(
                      "tabular px-4 py-3.5 text-end sm:px-6",
                      change == null ? "text-ink-subtle" : change >= 0 ? "text-gain" : "text-loss"
                    )}
                  >
                    {change != null ? formatPercent(change, { locale, signed: true }) : t("noPrice")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}


