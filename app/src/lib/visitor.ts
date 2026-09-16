import { api } from './api'

// Visitor identity: a server-signed token obtained anonymously.
// When VITE_TURNSTILE_SITE_KEY is configured, a Cloudflare Turnstile
// challenge runs before the token is issued (bot protection).

const STORAGE_KEY = 'visitor_token'
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''
// Refresh slightly before actual expiry
const EXPIRY_MARGIN_MS = 60_000

interface CachedToken {
  token: string
  expiresAt: number
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string
          appearance?: 'always' | 'execute' | 'interaction-only'
          callback?: (token: string) => void
          'error-callback'?: (code?: string) => void
          'timeout-callback'?: () => void
        }
      ) => string
      execute: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

function readCache(): CachedToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedToken
    if (!cached.token || typeof cached.expiresAt !== 'number') return null
    if (Date.now() > cached.expiresAt - EXPIRY_MARGIN_MS) return null
    return cached
  } catch {
    return null
  }
}

export function clearVisitorToken() {
  localStorage.removeItem(STORAGE_KEY)
}

// Decode the visitor id (vid) from a signed token without verifying it
// (verification happens server-side; this is only for local filtering).
export function vidFromToken(token: string): string {
  try {
    const body = token.split('.')[0]
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return typeof payload.vid === 'string' ? payload.vid : ''
  } catch {
    return ''
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('人机验证组件加载失败，请检查网络后重试'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

function runTurnstile(): Promise<string> {
  return loadTurnstileScript().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const el = document.createElement('div')
        // 居中显示验证框（默认会出现在文档流底部角落）
        el.style.position = 'fixed'
        el.style.left = '50%'
        el.style.top = '50%'
        el.style.transform = 'translate(-50%, -50%)'
        el.style.zIndex = '99999'
        document.body.appendChild(el)
        let settled = false
        const cleanup = () => {
          try {
            window.turnstile?.remove(widgetId)
          } catch {
            /* widget may already be gone */
          }
          el.remove()
        }
        const done = (fn: () => void) => {
          if (settled) return
          settled = true
          cleanup()
          fn()
        }
        const widgetId = window.turnstile!.render(el, {
          sitekey: SITE_KEY,
          // Widget stays hidden unless Cloudflare requires an interactive challenge
          appearance: 'interaction-only',
          callback: (token) => done(() => resolve(token)),
          'error-callback': () => done(() => reject(new Error('人机验证失败，请重试'))),
          'timeout-callback': () => done(() => reject(new Error('人机验证超时，请重试'))),
        })
        window.turnstile!.execute(widgetId)
      })
  )
}

let pending: Promise<string> | null = null

export function ensureVisitorToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = readCache()
    if (cached) return Promise.resolve(cached.token)
  } else {
    clearVisitorToken()
  }
  if (pending) return pending
  pending = (async () => {
    const turnstileToken = SITE_KEY ? await runTurnstile() : ''
    const res = await api.getVisitorToken(turnstileToken)
    const cached: CachedToken = { token: res.token, expiresAt: res.expiresAt }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
    return res.token
  })().finally(() => {
    pending = null
  })
  return pending
}
