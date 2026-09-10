export interface CapturedStream {
  /** Stable id derived from the URL. */
  id: string;
  url: string;
  tabId: number;
  /** Twitch channel name, parsed from the usher URL. */
  channel?: string;
  /** Referer sent by the page when it fetched the playlist (best guess). */
  referer?: string;
  /** Origin of the page that requested the stream. */
  pageOrigin?: string;
  firstSeen: number;
  lastSeen: number;
  /** How many times this exact URL was requested (live playlists refresh often). */
  count: number;
  type: 'master' | 'media' | 'unknown';
  /** Set once the background has fetched & parsed the playlist (success or failure). */
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
  kind: 'master' | 'media';
  variants: Variant[];
  audio: AudioRendition[];
}
