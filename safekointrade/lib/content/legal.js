import { brand } from "@/lib/config/brand";

/**
 * Legal page templates (English). They are starting points written for review
 * by qualified counsel in your jurisdiction — every page shows a notice saying
 * so. Legal text is intentionally not machine-translated; publish reviewed
 * translations here per locale when available.
 */
const B = brand.name;
const E = brand.legalName;

export const LEGAL_UPDATED = "2026-10-13";

export const legalPages = {
  terms: {
    title: "Terms of service",
    sections: [
      ["Agreement", `These terms govern your use of ${B}, operated by ${E}. By creating an account you agree to them. If you do not agree, do not use the platform.`],
      ["Eligibility", "You must be at least 18 years old and legally able to enter contracts where you live. You may not use the platform where doing so would break local law, including sanctions and licensing rules."],
      ["Your account", "Keep your sign-in details private and turn on two-step sign-in. You are responsible for activity on your account. Tell us at once if you think your account has been accessed without permission."],
      ["Demo mode", `While demo mode is active, balances, deposits, withdrawals and positions are simulated and have no monetary value. ${E} does not hold, transmit or custody customer funds during demo mode.`],
      ["Plans and positions", "Each plan sets a minimum and maximum amount and a fixed term. A position may be cancelled within 24 hours of opening; after that it runs to maturity. Plans do not promise any return. Where a return target is shown, it is accompanied by the basis on which it is calculated and is not a guarantee."],
      ["Deposits and withdrawals", "Deposits are credited only after a reviewer confirms receipt of funds. Withdrawals are held while they are reviewed and are completed only after payout is confirmed. We may refuse or reverse requests that appear fraudulent or unlawful, and may ask for identity verification first."],
      ["Fees", "Applicable fees, including withdrawal fees, are shown before you confirm a request."],
      ["Prohibited use", "Do not use the platform for money laundering, fraud, market manipulation, or to evade sanctions; do not attempt to access other users' data or interfere with the service."],
      ["Suspension and closure", "We may suspend or close accounts that breach these terms or where required by law. You may close your account at any time once no requests are pending."],
      ["Liability", "To the extent the law allows, we are not liable for losses caused by market movements, events outside our reasonable control, or your failure to keep your account secure."],
      ["Changes", "We will give notice of material changes to these terms through the dashboard and by email."],
      ["Contact", `Questions about these terms: ${brand.supportEmail}.`],
    ],
  },
  privacy: {
    title: "Privacy policy",
    sections: [
      ["Who we are", `${E} is the controller of personal data processed through ${B}.`],
      ["What we collect", "Account details (name, username, email address, phone number), security data (sign-in events, two-step sign-in enrolment), account activity (requests, positions, support messages), and technical data (IP address, device and browser information)."],
      ["Why we use it", "To run your account, review and record money movements, keep the platform secure, meet legal obligations, answer support requests, and — only with your consent — send product updates."],
      ["Legal bases", "Performance of our contract with you, legal obligation, legitimate interests in security and fraud prevention, and consent for marketing email."],
      ["Sharing", "With service providers that host and operate the platform (database and authentication hosting, email delivery, website hosting) under data processing agreements, and with authorities where the law requires it. We do not sell personal data."],
      ["Retention", "Account and transaction records are kept for as long as the law requires after account closure. Marketing consent records are kept until you unsubscribe and for a period afterwards as proof of consent."],
      ["Your rights", `Depending on where you live, you can ask to access, correct, delete or export your data, and object to or restrict processing. Contact ${brand.complianceEmail}.`],
      ["Security", "Data is encrypted in transit, access is limited by role, records are isolated with row-level security, and privileged actions are logged."],
      ["International transfers", "Where data leaves your country, we rely on recognised transfer safeguards."],
    ],
  },
  risk: {
    title: "Risk disclosure",
    sections: [
      ["Capital at risk", "Crypto assets are highly volatile. The value of a position can fall as well as rise, and you may get back less than you put in — including nothing at all."],
      ["No guaranteed returns", "No plan guarantees a return. Past performance, targets and market data are not reliable indicators of future results."],
      ["Regulation", "Crypto assets are unregulated or lightly regulated in many jurisdictions. Protections that apply to bank deposits or regulated investments may not apply."],
      ["Liquidity and term", "Positions are locked for their term after the 24-hour cancellation window. You may not be able to access these funds when you want to."],
      ["Operational and technology risk", "Platform outages, network congestion, cyber attacks or errors by third-party providers could delay deposits or withdrawals."],
      ["Demo mode", "While demo mode is active, all figures are simulated and do not represent real money or real market positions."],
      ["Not advice", "Nothing on this platform is financial, investment, tax or legal advice. Consider getting independent advice before investing."],
    ],
  },
  cookies: {
    title: "Cookie policy",
    sections: [
      ["Essential cookies", "We use strictly necessary cookies to keep you signed in (authentication session) and to remember your language choice. These cannot be switched off because the platform does not work without them."],
      ["Preferences", "Your theme choice is stored in your browser's local storage, not in a cookie, and never leaves your device unless you save it to your account settings."],
      ["Analytics and advertising", "We do not use analytics or advertising cookies. If that changes, we will ask for your consent first."],
      ["Managing cookies", "You can delete cookies in your browser settings. Deleting the session cookie signs you out."],
    ],
  },
};
