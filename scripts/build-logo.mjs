/**
 * Gera os PNGs de marca (fundo transparente) a partir dos JPGs originais.
 *
 *   node scripts/build-logo.mjs
 *
 * Os originais em assets/brand/ são JPG com fundo preto chapado e ~76% de
 * margem vazia. A arte é clara sobre preto, então o alfa sai da luminância
 * (alpha = max(r,g,b)) e a cor é des-premultiplicada — isso preserva o glow
 * das bordas, que um corte por limiar serrilharia.
 *
 * Saída em src/assets/brand/ (versionada; rode de novo só se o JPG mudar).
 */
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const ORIGEM = 'assets/brand/logo-white-wordmark.jpg'
const DESTINO = 'src/assets/brand'

/**
 * Recorte do emblema dentro do original 1536x1024 (ver scripts/probe-emblema.mjs):
 * as órbitas vão até x≈584, o wordmark branco começa em x≈611 e a tagline
 * dourada só aparece a partir de y≈592 — daí os limites abaixo.
 */
const EMBLEMA = { left: 132, top: 300, width: 470, height: 296 }

/**
 * Piso de ruído: o "preto" do JPG não é 0, oscila até ~PISO por causa dos
 * artefatos de compressão. Sem zerar essa faixa o alfa vira chiado — não
 * comprime e a des-premultiplicação transforma o ruído em cor saturada.
 */
const PISO = 20

/**
 * Converte preto → transparente e des-premultiplica a cor.
 *
 * `soCor`: mantém apenas pixels saturados (ouro/vermelho das órbitas) e
 * descarta os neutros. Serve para o emblema — o cometa é branco e sai do
 * quadro por dentro do wordmark, então qualquer recorte o deixaria cortado.
 *
 * `escureceNeutro`: pinta de preto o que é neutro (o wordmark branco), sem
 * tocar no ouro/vermelho. Gera o lockup para fundo claro mantendo a
 * tipografia original — sobre papel branco o wordmark branco sumiria.
 */
async function chaveiaPreto(pipeline, { soCor = false, escureceNeutro = false } = {}) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const out = Buffer.alloc(width * height * 4)
  for (let p = 0; p < width * height; p++) {
    const i = p * 4
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const pico = Math.max(r, g, b)
    if (pico <= PISO) continue // deixa o pixel 100% transparente e preto
    let a = Math.round(((pico - PISO) / (255 - PISO)) * 255) // reescala p/ não criar degrau
    if (soCor) {
      const sat = (pico - Math.min(r, g, b)) / pico
      // Desvanece o neutro em vez de cortar seco: mantém a borda das órbitas.
      // O piso alto (0.45) apaga onde o cometa branco se mistura ao ouro.
      a = Math.round(a * Math.min(1, Math.max(0, (sat - 0.45) / 0.18)))
      if (a === 0) continue
    }
    out[i + 3] = a
    // cor = cor_premultiplicada / alpha (usa o pico original como divisor)
    const k = 255 / pico
    let cr = Math.min(255, Math.round(r * k))
    let cg = Math.min(255, Math.round(g * k))
    let cb = Math.min(255, Math.round(b * k))
    if (escureceNeutro) {
      const sat = (pico - Math.min(r, g, b)) / pico
      // Mistura para o preto conforme o pixel é neutro; o ouro/vermelho passa ileso.
      const t = Math.min(1, Math.max(0, (0.45 - sat) / 0.2))
      cr = Math.round(cr * (1 - t) + 10 * t)
      cg = Math.round(cg * (1 - t) + 10 * t)
      cb = Math.round(cb * (1 - t) + 11 * t)
    }
    out[i] = cr
    out[i + 1] = cg
    out[i + 2] = cb
  }
  return sharp(out, { raw: { width, height, channels: 4 } })
}

/** Corta a moldura transparente que sobrar depois do chaveamento. */
const apara = (buf) => sharp(buf).trim({ threshold: 1 })

/** PNG paletizado: a arte tem poucas cores (ouro/vermelho/branco) + glow. */
const png = { compressionLevel: 9, effort: 10, palette: true, colours: 128, dither: 0.5 }

await mkdir(DESTINO, { recursive: true })

// 1) Lockup completo — emblema + wordmark branco. Só para superfícies escuras.
const cheio = await (await chaveiaPreto(sharp(ORIGEM))).png().toBuffer()
const infoCheio = await apara(cheio)
  .resize({ width: 640, withoutEnlargement: true })
  .png(png)
  .toFile(`${DESTINO}/logo-lockup.png`)

// 1b) Mesmo lockup, com o wordmark escuro — para papel e fundos claros.
const cheioClaro = await (await chaveiaPreto(sharp(ORIGEM), { escureceNeutro: true })).png().toBuffer()
const infoCheioClaro = await apara(cheioClaro)
  .resize({ width: 640, withoutEnlargement: true })
  .png(png)
  .toFile(`${DESTINO}/logo-lockup-claro.png`)

// 2) Só o emblema (órbitas) — anda junto do wordmark em texto, que segue o tema.
const marca = await (await chaveiaPreto(sharp(ORIGEM).extract(EMBLEMA), { soCor: true })).png().toBuffer()
const infoMarca = await apara(marca)
  .resize({ width: 256, height: 256, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png(png)
  .toFile(`${DESTINO}/logomark.png`)

// 3) Ícones do PWA e favicon — emblema sobre o preto da marca.
const PRETO = { r: 10, g: 10, b: 11, alpha: 1 } // --brand-black #0A0A0B
const marcaAparada = await apara(marca).png().toBuffer()

/**
 * Emblema centrado num quadrado, ocupando `escala` da aresta.
 * `raio` arredonda os cantos (0 = quadrado, para o maskable full-bleed).
 */
async function icone(aresta, escala, destino, { raio = 0 } = {}) {
  const interno = Math.round(aresta * escala)
  const arte = await sharp(marcaAparada)
    .resize({ width: interno, height: interno, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  const { height } = await sharp(arte).metadata()
  const camadas = [{ input: arte, left: Math.round((aresta - interno) / 2), top: Math.round((aresta - height) / 2) }]
  if (raio > 0) {
    const mascara = Buffer.from(
      `<svg width="${aresta}" height="${aresta}"><rect width="${aresta}" height="${aresta}" rx="${raio}" fill="#fff"/></svg>`,
    )
    camadas.push({ input: mascara, blend: 'dest-in' })
  }
  return sharp({ create: { width: aresta, height: aresta, channels: 4, background: PRETO } })
    .composite(camadas)
    .png(png)
    .toFile(destino)
}

await mkdir('public/icons', { recursive: true })
const R = 112 / 512 // mesmo arredondamento da arte anterior
const icones = await Promise.all([
  icone(192, 0.72, 'public/icons/icon-192.png', { raio: 192 * R }),
  icone(512, 0.72, 'public/icons/icon-512.png', { raio: 512 * R }),
  // maskable: quadrado full-bleed; a arte fica na zona segura (o SO recorta).
  icone(512, 0.56, 'public/icons/maskable-512.png'),
  icone(180, 0.72, 'public/icons/apple-touch-icon.png', { raio: 180 * R }),
  icone(180, 0.72, 'public/apple-touch-icon.png', { raio: 180 * R }),
  icone(96, 0.86, 'public/favicon.png', { raio: 96 * R }),
])

console.log(JSON.stringify({
  lockup: { arquivo: 'logo-lockup.png', ...infoCheio },
  lockupClaro: { arquivo: 'logo-lockup-claro.png', ...infoCheioClaro },
  marca: { arquivo: 'logomark.png', ...infoMarca },
  icones: icones.map((i) => `${i.width}x${i.height} · ${Math.round(i.size / 1024)}KB`),
}, null, 2))
