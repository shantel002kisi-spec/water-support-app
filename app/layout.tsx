import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Water Support Without Barriers",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Water Support", statusBarStyle: "default" },
  description: "A personal support workspace for letters, clear next steps, conversations and follow-up dates. Real on-device OCR and accessible reading tools.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
