# Identidade da Plataforma

## Hierarquia da marca

**Marca principal:** `JV FX`

**Marca secundária / laboratório:** `Vitorino LAB`

**Nome completo para títulos institucionais:** `JV FX · Vitorino LAB`

**Produto:** `Sistema Operacional do Trader`

A interface deve sempre priorizar **JV FX** visualmente. **Vitorino LAB** funciona como assinatura secundária, laboratório e identidade guarda-chuva do projeto.

## Implementação no código

A identidade está centralizada em:

```text
src/config/brand.ts
```

Componentes visuais reutilizáveis:

```text
src/components/brand/brand-identity.tsx
```

Não espalhar nomes da marca manualmente por novos componentes. Sempre reutilizar `BRAND` e os componentes de identidade.

## Persistência local

As novas chaves de demonstração usam o namespace `jvfx`. O código mantém migração automática das chaves antigas `axiom.*` para evitar perda dos dados demonstrativos existentes no navegador.
