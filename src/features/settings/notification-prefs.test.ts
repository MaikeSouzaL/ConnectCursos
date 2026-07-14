import { describe, it, expect } from 'vitest'
import { filtrarAlertas, notificationDefaults } from './notification-prefs'
import type { Alert } from '@/data/types'

const alerta = (kind: Alert['kind']): Alert => ({
  id: kind,
  kind,
  severity: 'info',
  title: kind,
  description: '',
  at: '2026-07-14T12:00:00.000Z',
})

/**
 * Os toggles de notificação já foram decorativos: mexer neles não mudava nada
 * no sino. O risco de regressão aqui é justamente esse — o filtro sumir e a
 * tela voltar a mentir que desligou algo.
 */
describe('filtrarAlertas', () => {
  it('esconde o que o usuário desligou', () => {
    const todos = [alerta('inadimplencia'), alerta('falta'), alerta('sala')]
    const so = (r: Alert[]) => r.map((a) => a.kind)

    expect(so(filtrarAlertas(todos, { ...notificationDefaults, faltas: false }))).toEqual([
      'inadimplencia',
      'sala',
    ])
    expect(so(filtrarAlertas(todos, { inadimplencia: false, faltas: false, reservas: false }))).toEqual([])
  })

  it('mostra tudo com as preferências padrão', () => {
    const todos = [alerta('inadimplencia'), alerta('falta'), alerta('sala')]
    expect(filtrarAlertas(todos, notificationDefaults)).toHaveLength(3)
  })

  it('nunca silencia aluguel nem sistema, que não têm toggle', () => {
    // Sem preferência que os governe, some-los seria escondê-los para sempre —
    // e são avisos sobre o dinheiro e a saúde do sistema.
    const semToggle = [alerta('aluguel'), alerta('sistema')]
    expect(filtrarAlertas(semToggle, { inadimplencia: false, faltas: false, reservas: false })).toHaveLength(2)
  })

  it('preferência ausente vale como ligada', () => {
    // Um usuário antigo, salvo antes de "faltas" existir, não pode ficar sem o aviso.
    expect(filtrarAlertas([alerta('falta')], { inadimplencia: true })).toHaveLength(1)
  })
})
