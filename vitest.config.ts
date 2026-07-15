import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Fuso de Brasília, antes de qualquer coisa carregar. A escola é no Brasil
// (UTC-3), e é justamente em fuso negativo que `new Date('2026-07-10')` cai no
// dia 9 — o bug que os helpers de data existem para evitar. Numa máquina em UTC
// o teste passaria mesmo com o código quebrado, e o verde não valeria nada.
process.env.TZ = 'America/Sao_Paulo'

// Config próprio, e não o vite.config.ts: aquele carrega o plugin do PWA, que
// tentaria montar um service worker a cada rodada de teste.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    // Credenciais falsas de propósito. src/lib/supabase.ts exige as variáveis e
    // para o app sem elas; aqui elas só precisam existir para o módulo carregar.
    // Sendo falsas, um teste que tente falar com o banco de verdade falha na
    // hora em vez de escrever no dev sem ninguém perceber.
    env: {
      VITE_SUPABASE_URL: 'http://teste.invalido',
      VITE_SUPABASE_ANON_KEY: 'chave-de-teste-nao-serve-para-nada',
    },
  },
})
