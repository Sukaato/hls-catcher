import type { StreamModule } from './types';

// usher.ttvnw.net/api/v2/channel/hls/<channel>.m3u8?...  (also the older /api/channel/hls/)
const CHANNEL_RE = /\/channel\/hls\/([^/.?#]+)\.m3u8/i;

export const twitch: StreamModule = {
  id: 'twitch',
  label: 'Twitch',
  hostPermissions: ['*://*.twitch.tv/*', '*://*.ttvnw.net/*'],
  filters: ['*://usher.ttvnw.net/api/*/channel/hls/*', '*://usher.ttvnw.net/api/channel/hls/*'],
  match({ url, headers }) {
    const channel = CHANNEL_RE.exec(url)?.[1]?.toLowerCase();
    if (!channel) return null;
    return {
      title: channel,
      referer: headers.referer || `https://www.twitch.tv/${channel}`,
      kind: 'master',
    };
  },
};
