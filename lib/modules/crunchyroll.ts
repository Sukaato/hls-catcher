import { isM3u8, type StreamModule } from './types';

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
  hostPermissions: ['*://*.crunchyroll.com/*', '*://*.crunchyrollsvc.com/*', '*://*.vrv.co/*'],
  filters: ['*://*.vrv.co/*', '*://*.crunchyroll.com/*.m3u8*', '*://*.crunchyrollsvc.com/*.m3u8*'],
  match({ url, tabUrl, tabTitle, headers }) {
    if (!isM3u8(url)) return null;

    // Only when the request comes from a Crunchyroll tab — *.vrv.co is a shared
    // CDN and could be embedded elsewhere.
    let onCrunchyroll = false;
    try {
      onCrunchyroll = tabUrl ? new URL(tabUrl).hostname.endsWith('crunchyroll.com') : false;
    } catch {
      onCrunchyroll = false;
    }
    if (!onCrunchyroll) return null;

    return {
      title: cleanTitle(tabTitle),
      referer: headers.referer || 'https://www.crunchyroll.com/',
      kind: 'master',
    };
  },
};
