/**
 * Brand configuration — change the name, contact details and legal entity here.
 * Colours live in app/globals.css (design tokens) so they apply to every theme.
 * The logo mark is components/ui/logo.js.
 */
export const brand = {
  name: "SafeKoinTrade",
  legalName: "SafeKoinTrade Ltd.", // replace with your registered entity
  tagline: "Term-based crypto plans with every figure on the record.",
  supportEmail: "support@example.com",
  complianceEmail: "compliance@example.com",
  address: "Registered address to be confirmed",
  // Demo mode labels every money flow as simulated. Keep this `true` until
  // custody, payment provider and licensing are in place (see README).
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
};

export const SIMULATION_NOTICE_KEY = "common.simulationNotice";
