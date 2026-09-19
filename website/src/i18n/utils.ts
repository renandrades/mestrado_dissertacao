import { ui, defaultLang, type Lang, type UiKey } from './ui';

// import.meta.env.BASE_URL is Astro's configured `base` (e.g.
// "/mestrado_dissertacao" on GitHub Pages, or "/" with no base configured
// for local dev) — NOT guaranteed to have a trailing slash (it doesn't, for
// a `base` written without one), so normalize that ourselves. Locale
// parsing/building must strip and re-add this prefix explicitly, or the
// site mis-detects the base path segment itself as the locale once
// deployed under a project subpath.
const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

function stripBase(pathname: string): string {
  return pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '');
}

export function getLangFromUrl(url: URL): Lang {
  const [lang] = stripBase(url.pathname).split('/');
  if (lang === 'pt' || lang === 'en') return lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

export function swapLocalePath(pathname: string, targetLang: Lang): string {
  const parts = stripBase(pathname).split('/').filter(Boolean);
  if (parts[0] === 'pt' || parts[0] === 'en') {
    parts[0] = targetLang;
  } else {
    parts.unshift(targetLang);
  }
  return BASE + parts.join('/') + '/';
}
