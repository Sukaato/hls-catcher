import type { AnalyzeResult, AudioRendition, Variant } from './types';

/** Parse an attribute list like `BANDWIDTH=123,RESOLUTION=1920x1080,NAME="1080p"`. */
export function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of input.matchAll(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g)) {
    const key = match[1];
    if (!key) continue;
    let value = match[2] ?? '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    attrs[key] = value;
  }
  return attrs;
}

export function resolveUri(base: string, uri: string): string {
  try {
    return new URL(uri, base).href;
  } catch {
    return uri;
  }
}

export function humanBitrate(bps?: number): string | undefined {
  if (!bps || bps <= 0) return undefined;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mb/s`;
  return `${Math.round(bps / 1000)} kb/s`;
}

function buildLabel(v: Partial<Variant>): string {
  const parts: string[] = [];
  // Twitch puts a friendly name ("1080p60 (source)", "Audio Only") on the
  // #EXT-X-MEDIA line; prefer it, fall back to the resolution.
  if (v.name) {
    parts.push(v.name);
  } else if (v.height) {
    const fps = v.frameRate && v.frameRate >= 49 ? Math.round(v.frameRate) : '';
    parts.push(`${v.height}p${fps}`);
  } else if (v.width) {
    parts.push(`${v.width}px de large`);
  }
  const br = humanBitrate(v.bandwidth ?? v.averageBandwidth);
  if (br) parts.push(br);
  if (!parts.length) parts.push('Qualité inconnue');
  return parts.join(' · ');
}

/**
 * Parse a master or media playlist.
 * - Master playlist (`#EXT-X-STREAM-INF`) → one entry per quality variant.
 * - Media playlist (`#EXTINF`) → a single "direct" entry pointing at the playlist itself.
 */
export function parsePlaylist(text: string, baseUrl: string): AnalyzeResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Pass 1 — collect #EXT-X-MEDIA renditions (video group names + audio tracks).
  const videoGroupNames: Record<string, string> = {};
  const audio: AudioRendition[] = [];
  for (const line of lines) {
    if (!line.startsWith('#EXT-X-MEDIA:')) continue;
    const a = parseAttributes(line.slice('#EXT-X-MEDIA:'.length));
    const group = a['GROUP-ID'];
    if (a.TYPE === 'VIDEO' && group) {
      videoGroupNames[group] = a.NAME || group;
    } else if (a.TYPE === 'AUDIO') {
      audio.push({
        uri: a.URI ? resolveUri(baseUrl, a.URI) : undefined,
        name: a.NAME,
        language: a.LANGUAGE,
        channels: a.CHANNELS,
        groupId: group,
        default: a.DEFAULT === 'YES',
      });
    }
  }

  // Pass 2 — build one variant per #EXT-X-STREAM-INF.
  const variants: Variant[] = [];
  let isMaster = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.startsWith('#EXT-X-STREAM-INF:')) continue;
    isMaster = true;
    const a = parseAttributes(line.slice('#EXT-X-STREAM-INF:'.length));

    let uri = '';
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (!next) continue;
      if (!next.startsWith('#')) {
        uri = next;
        i = j;
        break;
      }
    }

    const res = a.RESOLUTION ? a.RESOLUTION.split('x') : undefined;
    const variant: Variant = {
      uri: resolveUri(baseUrl, uri),
      bandwidth: a.BANDWIDTH ? parseInt(a.BANDWIDTH, 10) : undefined,
      averageBandwidth: a['AVERAGE-BANDWIDTH'] ? parseInt(a['AVERAGE-BANDWIDTH'], 10) : undefined,
      width: res?.[0] ? parseInt(res[0], 10) : undefined,
      height: res?.[1] ? parseInt(res[1], 10) : undefined,
      frameRate: a['FRAME-RATE'] ? parseFloat(a['FRAME-RATE']) : undefined,
      codecs: a.CODECS,
      name: a.NAME || (a.VIDEO ? videoGroupNames[a.VIDEO] : undefined),
      videoRange: a['VIDEO-RANGE'],
      label: '',
    };
    variant.label = buildLabel(variant);
    variants.push(variant);
  }

  if (!isMaster) {
    return {
      kind: 'media',
      variants: [{ uri: baseUrl, label: 'Flux direct (qualité unique)' }],
      audio,
    };
  }

  variants.sort(
    (a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.bandwidth ?? 0) - (a.bandwidth ?? 0),
  );

  return { kind: 'master', variants, audio };
}
