/**
 * A site module teaches HLS Catcher how to recognise a stream on one platform.
 * Add a file next to this one, implement {@link StreamModule}, and register it in
 * `index.ts` — nothing else in the extension is platform-aware.
 */

export interface MatchContext {
  /** The request URL that passed a module filter. */
  url: string;
  tabId: number;
  /** URL of the tab that made the request (needs the `tabs` permission). */
  tabUrl?: string;
  /** Title of that tab, useful when the stream URL carries no readable name. */
  tabTitle?: string;
  /** Lower-cased request headers. */
  headers: Record<string, string>;
}

export interface ModuleMatch {
  /** Label shown in the popup (channel, series + episode, page title…). */
  title: string;
  /** Referer to replay on the player tab so the CDN serves the segments. */
  referer?: string;
  /** Optional hint; the manifest analyzer still has the final say. */
  kind?: 'master' | 'media' | 'dash';
}

export interface StreamModule {
  /** Stable identifier, stored on every captured stream. */
  id: string;
  /** Human name for the popup. */
  label: string;
  /** Host patterns this module needs in `host_permissions`. */
  hostPermissions: string[];
  /** `webRequest` URL filter patterns — keep them as narrow as possible. */
  filters: string[];
  /** Return a match when the request is a capturable stream, else `null`. */
  match(context: MatchContext): ModuleMatch | null;
}

const M3U8_RE = /\.m3u8($|[?#])/i;
const MPD_RE = /\.mpd($|[?#])/i;

/** Shared helper: is this URL an HLS playlist? */
export function isM3u8(url: string): boolean {
  return M3U8_RE.test(url);
}

/** Shared helper: is this URL a DASH manifest? */
export function isMpd(url: string): boolean {
  return MPD_RE.test(url);
}
