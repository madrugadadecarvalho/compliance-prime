import type { NextConfig } from "next";

/**
 * Compliance Prime lida com dados pessoais e decisões regulatórias.
 * Por isso:
 *  - todas as páginas autenticadas são renderizadas por pedido (sem cache de dados sensíveis);
 *  - a Content-Security-Policy com nonce é aplicada em `src/proxy.ts`;
 *  - os restantes cabeçalhos de segurança são definidos aqui para todas as rotas.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  experimental: {
    serverActions: {
      // Uploads de documentos são limitados a 5 MB na validação; margem para o envelope multipart.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
