import { humanBitrate } from './m3u8';
import type { AnalyzeResult, AudioRendition, Variant } from './types';

/** Parse `key="value"` pairs out of a start tag. */
function tagAttrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    if (m[1]) out[m[1]] = m[2] ?? '';
  }
  return out;
}

/** DASH `frameRate` is a number or an `a/b` ratio. */
function frameRate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  if (value.includes('/')) {
    const [a, b] = value.split('/').map(Number);
    return a && b ? a / b : undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function dashLabel(v: Pick<Variant, 'height' | 'width' | 'frameRate' | 'bandwidth'>): string {
  const parts: string[] = [];
  if (v.height) {
    const fps = v.frameRate && v.frameRate >= 49 ? Math.round(v.frameRate) : '';
    parts.push(`${v.height}p${fps}`);
  } else if (v.width) {
    parts.push(`${v.width}px de large`);
  }
  const br = humanBitrate(v.bandwidth);
  if (br) parts.push(br);
  if (!parts.length) parts.push('Qualité inconnue');
  return parts.join(' · ');
}

/**
 * Parse an MPEG-DASH manifest (.mpd). Regex based on purpose: the background
 * runs in a service worker with no `DOMParser`. Good enough for the flat,
 * single-Period manifests Crunchyroll serves.
 *
 * DASH variants aren't independently playable without the manifest, so every
 * variant keeps `uri = <manifest url>` — the list is informational.
 */
export function parseMpd(xml: string, manifestUrl: string): AnalyzeResult {
  const drm = /<ContentProtection\b/i.test(xml);
  const variants: Variant[] = [];
  const audio: AudioRendition[] = [];
  const audioLangs = new Set<string>();

  for (const setMatch of xml.matchAll(/<AdaptationSet\b[^>]*>([\s\S]*?)<\/AdaptationSet>/gi)) {
    const startTag = setMatch[0].slice(0, setMatch[0].indexOf('>') + 1);
    const sa = tagAttrs(startTag);
    const body = setMatch[1] ?? '';
    const mime = `${sa.mimeType ?? ''} ${sa.contentType ?? ''}`.toLowerCase();

    let isVideo = mime.includes('video');
    const isAudio = mime.includes('audio');
    if (!isVideo && !isAudio) isVideo = /<Representation\b[^>]*\bheight=/i.test(body);

    const setFps = frameRate(sa.frameRate);

    for (const rep of body.matchAll(/<Representation\b[^>]*?\/?>/gi)) {
      const ra = tagAttrs(rep[0]);
      if (isVideo) {
        const variant: Variant = {
          uri: manifestUrl,
          bandwidth: ra.bandwidth ? parseInt(ra.bandwidth, 10) : undefined,
          width: ra.width ? parseInt(ra.width, 10) : undefined,
          height: ra.height ? parseInt(ra.height, 10) : undefined,
          frameRate: frameRate(ra.frameRate) ?? setFps,
          codecs: ra.codecs,
          label: '',
        };
        variant.label = dashLabel(variant);
        variants.push(variant);
      } else {
        // One entry per language (DASH lists a rendition per audio bitrate).
        const lang = sa.lang ?? '';
        if (audioLangs.has(lang)) continue;
        audioLangs.add(lang);
        audio.push({ language: sa.lang, default: false });
      }
    }
  }

  variants.sort(
    (a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.bandwidth ?? 0) - (a.bandwidth ?? 0),
  );

  return { kind: 'dash', variants, audio, drm };
}
