/**
 * locale.ts — URL-driven locale (path-based i18n for SEO).
 *
 * English lives at /, Traditional Chinese at /zh/*. The router mounts with
 * basename '/zh' on Chinese URLs, so every internal <Link to="/x"> resolves to
 * /zh/x automatically — no per-link changes needed. The URL always wins over
 * any stored language preference (search engines must see a stable language
 * per URL); the header toggle navigates between locale URLs instead of
 * flipping client state.
 */

export const IS_ZH: boolean =
  typeof window !== 'undefined' && /^\/zh(\/|$)/.test(window.location.pathname);

export const BASENAME = IS_ZH ? '/zh' : '/';

export const URL_LANG: 'en' | 'zh' = IS_ZH ? 'zh' : 'en';

/** Absolute path of the SAME page in the other locale (keeps query string). */
export function localeSwitchHref(): string {
  const { pathname, search } = window.location;
  if (IS_ZH) {
    const p = pathname.replace(/^\/zh/, '') || '/';
    return p + search;
  }
  return (pathname === '/' ? '/zh' : `/zh${pathname}`) + search;
}

export const SITE = 'https://www.dimpack3d.com';

/** Canonical URLs for a router-relative path (no /zh prefix). */
export function localeUrls(routerPath: string) {
  const clean = routerPath === '/' ? '' : routerPath.replace(/\/$/, '');
  return {
    en: `${SITE}${clean || '/'}` === `${SITE}` ? `${SITE}/` : `${SITE}${clean || '/'}`,
    zh: `${SITE}/zh${clean}`,
  };
}
