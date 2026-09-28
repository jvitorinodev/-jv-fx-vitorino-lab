export const BRAND = {
  primaryName: "JV FX",
  secondaryName: "Vitorino LAB",
  monogram: "JV",
  productName: "Sistema Operacional do Trader",
  fullName: "JV FX · Vitorino LAB",
  description: "Ambiente profissional para análise, risco, planejamento, diário e desempenho operacional.",
  storageNamespace: "jvfx",
  version: "1.2.10",
} as const;

export type BrandConfig = typeof BRAND;
