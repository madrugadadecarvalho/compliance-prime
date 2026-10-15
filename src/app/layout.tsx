import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Compliance Prime", template: "%s · Compliance Prime" },
  description: "Plataforma de KYC/AML: onboarding de clientes, due diligence, screening de sanções e trilha de auditoria.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Ler os cabeçalhos força renderização por pedido, necessária para o nonce da CSP (ver src/proxy.ts).
  await headers();
  return (
    <html lang="pt-AO" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
