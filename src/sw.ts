/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

/**
 * Service worker do app.
 *
 * Era gerado pelo vite-plugin-pwa (generateSW), que não deixa acrescentar
 * handler nenhum. Passou a ser escrito à mão (injectManifest) por causa do
 * push: sem ele, o aviso de aula cancelada só alcançava quem já estivesse com
 * o app aberto — o oposto de "não perca a viagem".
 *
 * O precache continua igual: o plugin injeta a lista em self.__WB_MANIFEST.
 */
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// autoUpdate: assume o controle assim que instala, sem esperar a aba fechar.
self.skipWaiting()
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

type Payload = {
  title: string
  body: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  let p: Payload
  try {
    p = event.data.json()
  } catch {
    p = { title: 'Conect Cursos', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // tag: um aviso novo da mesma turma substitui o anterior em vez de empilhar.
      tag: p.tag,
      data: { url: p.url ?? '/' },
      requireInteraction: false,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? '/'

  // Reaproveita uma aba já aberta do app; só abre outra se não houver nenhuma.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if (aba.url.includes(self.registration.scope) && 'focus' in aba) {
          void aba.navigate(url)
          return aba.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
