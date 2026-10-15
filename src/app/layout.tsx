import type { Metadata, Viewport } from "next";
import { getTheme } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Compliance Prime", template: "%s · Compliance Prime" },
  description: "Plataforma de KYC/AML: onboarding de clientes, due diligence, screening de sanções e trilha de auditoria.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#111316" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Ler cookies força renderização por pedido, necessária para o nonce da CSP (ver src/proxy.ts)
  // e para aplicar o tema escolhido sem flash.
  const theme = await getTheme();
  return (
    <html lang="pt-AO" data-theme={theme} className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-background text-on-surface antialiased">{children}</body>
    </html>
  );
}
