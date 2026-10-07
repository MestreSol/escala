import type { NextConfig } from "next";

const emDesenvolvimento = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy: o navegador só carrega script, estilo, imagem e
 * conexão do próprio site (+ fotos do Supabase Storage). Se alguém conseguir
 * injetar HTML numa página, não consegue puxar script de fora nem mandar
 * dados pra outro domínio. 'unsafe-inline' é necessário pros scripts inline
 * que o próprio Next gera; 'unsafe-eval'/ws só no `next dev` (HMR).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self'${emDesenvolvimento ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabecalhosDeSeguranca = [
  { key: "Content-Security-Policy", value: csp },
  // Ninguém consegue embutir o site num <iframe> (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Navegador não "adivinha" tipo de arquivo (ex: tratar upload como script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Links pra fora não levam o caminho completo (com ?nome=, ids etc.).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(emDesenvolvimento
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // Gera .next/standalone (server.js + só as dependências usadas) só no build
  // da imagem Docker (ver Dockerfile). Na Vercel o standalone quebra o build
  // ("ENOENT .next/next-server.js.nft.json"), então fica desligado lá.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: cabecalhosDeSeguranca },
      // Painel e login nunca vão pra cache compartilhado (CDN/proxy).
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
