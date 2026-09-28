import { selectionFromKeys } from "@/lib/core/confluence-service";
import { buildPriceZoneRecord } from "@/lib/core/price-zone-service";
import type { PriceZoneRecord } from "@/lib/types/price-zones";

export function createDemoPriceZones(): PriceZoneRecord[] {
  const now = new Date();
  const base = now.getTime();
  return [
    buildPriceZoneRecord({
      actorId: "demo-ceo",
      marketType: "COMMODITY",
      now: new Date(base - 25 * 60_000),
      input: {
        zoneId: "demo-zone-xau-long",
        setupId: "XAUUSD-DEMO-001",
        symbol: "XAUUSD",
        direction: "LONG",
        timeframe: "4H",
        zoneType: "FVG",
        lowerPrice: 3667,
        upperPrice: 3673,
        invalidationPrice: 3658,
        priceLocation: "DISCOUNT",
        status: "APPROACHING",
        confluences: selectionFromKeys(["htf_alignment", "liquidity_sweep", "fvg", "mss", "premium_discount", "price_action_confirmation"], undefined, "4H"),
        alertEnabled: true,
        notes: "Zona demonstrativa vinculada ao contexto altista do ouro. Cotação exibida é apenas demo.",
        source: "DEMO",
      },
    }),
    buildPriceZoneRecord({
      actorId: "demo-ceo",
      marketType: "INDEX",
      now: new Date(base - 80 * 60_000),
      input: {
        zoneId: "demo-zone-nas-short",
        setupId: "NAS100-DEMO-001",
        symbol: "NAS100",
        direction: "SHORT",
        timeframe: "1H",
        zoneType: "ORDER_BLOCK",
        lowerPrice: 24185,
        upperPrice: 24235,
        invalidationPrice: 24275,
        priceLocation: "PREMIUM",
        status: "WAITING",
        confluences: selectionFromKeys(["htf_alignment", "order_block", "mss", "liquidity_sweep", "session_killzone"], undefined, "1H"),
        alertEnabled: false,
        notes: "Exemplo de zona de venda no índice. Validação manual antes de qualquer planejamento.",
        source: "DEMO",
      },
    }),
  ];
}
