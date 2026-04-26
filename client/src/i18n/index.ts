import zh from './locales/zh'
import en from './locales/en'

export type Lang = 'zh' | 'en'

const locales: Record<Lang, Record<string, string>> = { zh, en }

// In-memory cache — t() is called from render loops, must avoid hitting localStorage every frame.
let cachedLang: Lang | null = null

function readLangFromStorage(): Lang {
  const saved = localStorage.getItem('neon_arcade_lang')
  return (saved === 'en' || saved === 'zh') ? saved : 'zh'
}

/** Get the current language. Cached after first read. */
export function getLang(): Lang {
  if (cachedLang === null) cachedLang = readLangFromStorage()
  return cachedLang
}

/** Set language preference and update the cache. */
export function setLang(lang: Lang) {
  cachedLang = lang
  localStorage.setItem('neon_arcade_lang', lang)
}

/** Translate a key with optional interpolation: t('shooter_wave', { n: 5 }) → "第5波" */
export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getLang()
  let text = locales[lang]?.[key] ?? locales.zh[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return text
}

/** Font stack used for in-canvas game rendering — kept in sync with globals.css body font. */
export function getGameFont(): string {
  return getLang() === 'zh'
    ? '"Noto Sans SC", "ZCOOL QingKe HuangYou", "JetBrains Mono", sans-serif'
    : '"Press Start 2P", "JetBrains Mono", monospace'
}

/** Font stack for HUDs/scoreboards inside canvas — tabular digits, CJK-aware. */
export function getHudFont(weight: 400 | 600 | 700 = 600): string {
  return `${weight} 14px "JetBrains Mono", "Noto Sans SC", monospace`
}

export function useT() {
  return t
}
