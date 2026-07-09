// Gera os ícones PNG do PWA a partir do emblema da marca.
// Uso: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const OUT = path.resolve(import.meta.dirname, '../public/icons')

const emblem = `
  <defs>
    <linearGradient id="gold" x1="90" y1="180" x2="430" y2="360" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFDE59" /><stop offset="1" stop-color="#FFB300" />
    </linearGradient>
    <linearGradient id="red" x1="150" y1="150" x2="380" y2="400" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FF3B3B" /><stop offset="1" stop-color="#C00510" />
    </linearGradient>
    <linearGradient id="comet" x1="250" y1="235" x2="432" y2="150" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF" stop-opacity="0" /><stop offset="1" stop-color="#FFFFFF" />
    </linearGradient>
  </defs>
  <g transform="translate(256 262)">
    <ellipse rx="150" ry="66" transform="rotate(-24)" fill="none" stroke="url(#gold)" stroke-width="42" stroke-linecap="round" />
    <ellipse rx="150" ry="66" transform="rotate(42)" fill="none" stroke="url(#red)" stroke-width="42" stroke-linecap="round" />
  </g>
  <path d="M262 236 C 320 205, 372 182, 432 150 C 388 200, 340 232, 286 258 Z" fill="url(#comet)" opacity="0.95" />
  <circle cx="432" cy="150" r="11" fill="#FFFFFF" />`

// Ícone padrão: cantos arredondados, emblema em escala cheia.
const rounded = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#0A0A0B" />${emblem}</svg>`

// Maskable: fundo full-bleed + emblema menor dentro da safe zone (80%).
const maskable = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0A0A0B" />
  <g transform="translate(256 256) scale(0.7) translate(-256 -262)">${emblem}</g></svg>`

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(OUT, file))
  console.log('  ->', file)
}

await mkdir(OUT, { recursive: true })
console.log('Gerando ícones em public/icons:')
await png(rounded(192), 192, 'icon-192.png')
await png(rounded(512), 512, 'icon-512.png')
await png(maskable(512), 512, 'maskable-512.png')
await png(rounded(180), 180, 'apple-touch-icon.png')
console.log('OK')
