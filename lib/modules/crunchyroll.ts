import { isMpd, type StreamModule } from './types';

// .../playback/v2/manifest/<epId>/static/<asset>/<n>/<locale-or-"clean">/dash/manifest.mpd
const LOCALE_RE = /\/\d+\/([a-z]{2}-[A-Za-z0-9]+|clean)\/dash\//i;

function safeHost(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const onCrunchyroll = (host: string): boolean => /(^|\.)crunchyroll\.com$/i.test(host);

function cleanTitle(raw: string | undefined): string {
  if (!raw) return 'Crunchyroll';
  return (
    raw
      .replace(/\s*[-–|]\s*Watch on Crunchyroll.*$/i, '')
      .replace(/\s*[-–|]\s*Crunchyroll.*$/i, '')
      .replace(/^Watch\s+/i, '')
      .trim() || 'Crunchyroll'
  );
}

export const crunchyroll: StreamModule = {
  id: 'crunchyroll',
  label: 'Crunchyroll',
  hostPermissions: ['*://*.crunchyroll.com/*', '*://*.crunchyrollcdn.com/*'],
  // Crunchyroll streams are MPEG-DASH (.mpd), not HLS.
  filters: ['*://*.crunchyroll.com/playback/*/manifest/*'],
  match({ url, tabUrl, tabTitle, headers }) {
    // The manifest URL is self-identifying (…crunchyroll.com/playback/…/manifest/…mpd);
    // the tab only supplies a readable title.
    if (!isMpd(url) || !onCrunchyroll(safeHost(url))) return null;

    const locale = LOCALE_RE.exec(url)?.[1];
    const base = cleanTitle(tabTitle);
    const title = locale && locale !== 'clean' ? `${base} [${locale}]` : base;

    return {
      title,
      referer: headers.referer || tabUrl || 'https://www.crunchyroll.com/',
      kind: 'dash',
    };
  },
};
