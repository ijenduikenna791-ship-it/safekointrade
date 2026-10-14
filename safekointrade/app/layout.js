import "./globals.css";

// The <html> element lives in app/[locale]/layout.js so `lang` and `dir`
// follow the active locale. This root layout only passes children through.
export default function RootLayout({ children }) {
  return children;
}
