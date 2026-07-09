# Conect Cursos — Style Guide

Guia de design da plataforma. **Dark-first**, nascido da logo (preto + ouro + vermelho).
Tudo em CSS variables mapeadas para o Tailwind v4 em [`src/styles/globals.css`](src/styles/globals.css).

> Regra de ouro: **nunca** use cores cruas (`#FFC400`, `bg-yellow-400`) nas telas.
> Use sempre os tokens semânticos (`bg-primary`, `text-muted-foreground`, `border-border`…).

---

## 1. Marca

- **Nome:** CONECT CURSOS · **Tagline:** "Conectada ao seu futuro".
- **Emblema:** órbitas entrelaçadas ouro + vermelho com cometa — componente [`Logomark`](src/components/brand/Logo.tsx).
- **Personalidade:** premium, tecnológico, energético, confiável.

## 2. Cores (tokens)

| Token | Uso | Dark | Light |
|---|---|---|---|
| `background` | fundo da página | `#0A0A0B` | `#F7F7F8` |
| `card` / `popover` | superfícies elevadas | `#141416` | `#FFFFFF` |
| `foreground` | texto principal | `#FAFAFA` | `#0A0A0B` |
| `muted-foreground` | texto secundário | `#A1A1AA` | `#64646D` |
| `primary` | **cor de ação (ouro)** | `#FFC400` | `#B98900` |
| `border` / `input` | bordas e campos | `#2A2A2E` | `#E3E3E7` |
| `brand-gold` / `brand-red` | destaques de marca, gráficos | puro | puro |
| `success` `warning` `destructive` `info` | semânticos | — | — |
| `chart-1..5` | séries de gráfico | ouro, vermelho, azul, verde, roxo |

**Ouro = ação.** O vermelho é acento de marca/energia (badges de curso, destaques), **não** é o vermelho de erro — esse é `destructive`.
Contraste alvo **WCAG AA**. No light, o ouro de ação é escurecido (`#B98900`) para passar contraste sobre branco.

## 3. Tipografia

- **Display / títulos:** `font-display` → **Space Grotesk Variable** (h1–h5 automáticos, tracking -0.02em).
- **Corpo / UI:** `font-sans` → **Inter Variable**.
- **Valores financeiros:** classe `.tabular` (`tabular-nums`) para alinhar colunas de dinheiro.
- Fontes **self-hosted** via `@fontsource-variable` (offline, sem CDN).

## 4. Fundamentos

- **Espaçamento:** escala de 4px do Tailwind.
- **Raios:** `--radius: 0.85rem`. Utilitários `rounded-md/lg/xl`. Cards = `rounded-xl`.
- **Sombras:** sutis; glassmorphism leve via `.glass` em overlays.
- **Grid:** **bento** para dashboards (`grid` + `col-span` variados).
- **Motion:** discreto (Framer Motion) — micro-interações; botões têm `active:scale-[0.98]`.
- **Utilitários de marca:** `.bg-brand-glow` (brilho radial), `.text-brand-gradient`, `.glass`, `.ring-brand`.

## 5. Biblioteca de componentes (`src/components/ui`)

Base **shadcn-style sobre Radix**, React 19 (ref-as-prop), `data-slot` para hooks de estilo.

Button · Badge · Card · Input · Textarea · Label · Select · Switch · Checkbox · Tabs ·
Dialog · Sheet · DropdownMenu · Tooltip · Progress · ScrollArea · Table · Separator ·
Skeleton · Avatar · Sonner (Toaster).

**Compostos / marca:** `StatCard` (KPI com trend) · `PageHeader` · `EmptyState` ·
`ThemeToggle` · `Logo`/`Logomark`.

## 6. Variantes principais

- **Button:** `default` (ouro), `red`, `outline`, `secondary`, `ghost`, `link`, `destructive` · tamanhos `sm/default/lg/icon/icon-sm`.
- **Badge:** `default` `secondary` `outline` `success` `warning` `danger` `info` `gold` `red` `solid`.

## 7. Convenções

- Imports por alias `@/…`.
- Formatação sempre via [`src/lib/format.ts`](src/lib/format.ts): `formatBRL`, `formatDate`, `formatDateTime`, `initials`, etc.
- Combinar classes com `cn()` de [`src/lib/utils.ts`](src/lib/utils.ts).
- Idioma **pt-BR**, moeda **BRL**, datas locais.
