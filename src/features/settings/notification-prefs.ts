import { create } from 'zustand'
import { preferencesService } from '@/data/services'
import type { Alert } from '@/data/types'

/**
 * Preferências de notificação — o que o sino do painel mostra.
 *
 * Ficam num store (e não em estado local) porque quem EDITA é a tela de
 * Configurações e quem OBEDECE é o sino, que vive no cabeçalho. Sem estado
 * compartilhado, desligar um aviso não surtiria efeito até recarregar a página
 * — e pareceria quebrado.
 */
/**
 * Só entra aqui preferência que governa um alerta que o sistema realmente
 * gera (ver dashboardService.alerts).
 *
 * "Faltas de alunos" tinha saído por não ter o que desligar — nada gravava
 * falta. Voltou junto com o "fechar chamada", que faz a falta existir.
 * "Resumo diário por e-mail" continua fora: não há envio de e-mail nenhum.
 */
export const notificationDefs = [
  {
    key: 'inadimplencia',
    label: 'Alertas de inadimplência',
    desc: 'Avisar quando um aluno ficar em atraso.',
  },
  {
    key: 'faltas',
    label: 'Faltas de alunos',
    desc: 'Avisar sobre faltas dos últimos 7 dias.',
  },
  {
    key: 'reservas',
    label: 'Reservas de sala',
    desc: 'Avisar sobre reservas pendentes de confirmação.',
  },
] as const

export type PrefKey = (typeof notificationDefs)[number]['key']

/** Padrão: tudo ligado. Quem nunca mexeu recebe todos os avisos. */
export const notificationDefaults: Record<string, boolean> = {
  inadimplencia: true,
  faltas: true,
  reservas: true,
}

/**
 * Qual preferência governa cada tipo de alerta.
 * Tipo fora deste mapa (aluguel, sistema) aparece sempre — são avisos sobre o
 * dinheiro e a saúde do sistema, não dá para silenciar.
 */
const prefPorTipo: Partial<Record<Alert['kind'], PrefKey>> = {
  inadimplencia: 'inadimplencia',
  falta: 'faltas',
  sala: 'reservas',
}

/** Aplica as preferências à lista de alertas. */
export function filtrarAlertas(alerts: Alert[], prefs: Record<string, boolean>): Alert[] {
  return alerts.filter((a) => {
    const chave = prefPorTipo[a.kind]
    if (!chave) return true // sem preferência = sempre mostra
    return prefs[chave] ?? notificationDefaults[chave] ?? true
  })
}

type Store = {
  prefs: Record<string, boolean>
  carregado: boolean
  carregar: (userId: string) => Promise<void>
  alternar: (userId: string, key: PrefKey, valor: boolean) => Promise<void>
}

export const useNotificationPrefs = create<Store>((set, get) => ({
  prefs: notificationDefaults,
  carregado: false,
  async carregar(userId) {
    const salvas = await preferencesService.get(userId)
    set({ prefs: { ...notificationDefaults, ...salvas }, carregado: true })
  },
  async alternar(userId, key, valor) {
    const anterior = get().prefs
    const novas = { ...anterior, [key]: valor }
    set({ prefs: novas }) // otimista: o toggle responde na hora
    try {
      await preferencesService.update(userId, novas)
    } catch (e) {
      set({ prefs: anterior }) // falhou: volta, senão a tela mente
      throw e
    }
  },
}))
