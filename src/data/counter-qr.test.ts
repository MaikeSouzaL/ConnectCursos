import { describe, it, expect } from 'vitest'
import { parseCounterQr, counterQrPayload } from './services'

/**
 * Este parser é o portão da presença.
 *
 * Antes dele existir, o scanner registrava presença com QUALQUER QR Code — o
 * aluno apontava para o código de um pacote de bolacha, de casa, e ficava
 * presente. Cada teste abaixo é essa falha tentando voltar.
 *
 * Ele é a 1ª de duas barreiras: aqui se confere o formato, e o RPC
 * counter_token_valido confere se o token é mesmo o do balcão. Este teste cobre
 * a barreira de formato; a outra vive no banco.
 */
describe('parseCounterQr', () => {
  const token = '3f8a1c2e-5b7d-4e9f-a1b3-c5d7e9f1a3b5'

  it('aceita o QR do balcão e devolve o token', () => {
    expect(parseCounterQr(counterQrPayload(token))).toBe(token)
  })

  it('recusa QR de terceiros — a falha original', () => {
    for (const alheio of [
      'https://wa.me/5511999999999',
      'http://localhost:5173/aluno',
      '7891000315507', // código de barras de produto
      'BEGIN:VCARD\nFN:Fulano\nEND:VCARD',
      'PIX0014BR.GOV.BCB.PIX',
      '',
      '   ',
    ]) {
      expect(parseCounterQr(alheio), `deveria recusar: ${alheio}`).toBeNull()
    }
  })

  it('recusa o prefixo certo com token que não é UUID', () => {
    for (const lixo of ['', 'abc', '../../etc/passwd', "' or 1=1--", '3f8a1c2e5b7d4e9fa1b3c5d7e9f1a3b5']) {
      expect(parseCounterQr(`conect://checkin?balcao=${lixo}`)).toBeNull()
    }
  })

  it('não deixa o prefixo aparecer no meio do texto', () => {
    // Um QR alheio que só CONTÉM o prefixo não vale: tem que começar com ele.
    expect(parseCounterQr(`https://site.com/?x=conect://checkin?balcao=${token}`)).toBeNull()
  })

  it('aceita UUID em maiúsculas (o leitor pode normalizar)', () => {
    expect(parseCounterQr(counterQrPayload(token.toUpperCase()))).toBe(token.toUpperCase())
  })

  it('tolera espaço em volta do token, que a câmera às vezes acrescenta', () => {
    expect(parseCounterQr(`${counterQrPayload(token)}  `)).toBe(token)
  })
})
