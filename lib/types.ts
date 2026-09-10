export interface CapturedStream {
  /** Stable id derived from the URL. */
  id: string;
  url: string;
  tabId: number;
  /** Id of the site module that recognised this stream (e.g. `twitch`). */
  moduleId: string;
  /** Display label from the module (channel, series + episode, page title…). */
  title: string;
  /** Referer to replay on the player tab so the CDN serves the segments. */
  referer?: string;
  firstSeen: number;
  lastSeen: number;
  /** How many times this exact URL was requested (live playlists refresh often). */
  count: number;
  type: 'master' | 'media' | 'dash' | 'unknown';
  /** DASH manifest guarded by DRM (Widevine / PlayReady). */
  drm?: boolean;
  /** Set once the background has fetched & parsed the manifest (success or failure). */
  analyzedAt?: number;
  analyzeError?: string;
  /** Quality variants (master) or a single "direct" entry (media). */
  variants?: Variant[];
  audio?: AudioRendition[];
}

export interface Variant {
  /** Absolute URI of the variant playlist. */
  uri: string;
  bandwidth?: number;
  averageBandwidth?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  codecs?: string;
  name?: string;
  videoRange?: string;
  /** Human readable label, e.g. "1080p · 5.0 Mb/s". */
  label: string;
}

export interface AudioRendition {
  uri?: string;
  name?: string;
  language?: string;
  channels?: string;
  groupId?: string;
  default: boolean;
}

export interface AnalyzeResult {
  kind: 'master' | 'media' | 'dash';
  variants: Variant[];
  audio: AudioRendition[];
  /** DASH only: manifest carries `<ContentProtection>`. */
  drm?: boolean;
}
