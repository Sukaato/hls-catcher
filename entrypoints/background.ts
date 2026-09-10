import { parsePlaylist } from '@/lib/m3u8';
import { allFilters, matchStream } from '@/lib/modules';
import { parseMpd } from '@/lib/mpd';
import type { CapturedStream } from '@/lib/types';

const IS_CHROME = import.meta.env.CHROME;
const SESSION_KEY = 'hlscatcher:streams';

export default defineBackground(() => {
  /** tabId -> (url -> stream). */
  const store = new Map<number, Map<string, CapturedStream>>();
  /** player tabId -> DNR session rule id (referer spoofing). */
  const playerRules = new Map<number, number>();
  let ruleIdSeq = 2000;

  // ----------------------------------------------------------------- helpers --
  const idFor = (url: string): string => {
    let h = 0;
    for (let i = 0; i < url.length; i++) h = (Math.imul(h, 31) + url.charCodeAt(i)) | 0;
    return `s${(h >>> 0).toString(36)}`;
  };

  const tabMap = (tabId: number): Map<string, CapturedStream> => {
    let m = store.get(tabId);
    if (!m) {
      m = new Map();
      store.set(tabId, m);
    }
    return m;
  };

  const headerMap = (list?: Array<{ name: string; value?: string }>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const it of list ?? []) out[it.name.toLowerCase()] = it.value ?? '';
    return out;
  };

  const updateBadge = (tabId: number): void => {
    const n = store.get(tabId)?.size ?? 0;
    browser.action.setBadgeText({ tabId, text: n ? String(n) : '' }).catch(() => {});
    browser.action.setBadgeBackgroundColor({ color: '#7c3aed' }).catch(() => {});
  };

  // ----------------------------------------------------------- persistence --
  // The service worker can be suspended mid-session; the Twitch master playlist
  // is only requested once at playback start, so keep a copy in session storage.
  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  const schedulePersist = (): void => {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
      persistTimer = undefined;
      const dump: Record<string, CapturedStream[]> = {};
      for (const [tabId, m] of store) dump[tabId] = [...m.values()];
      browser.storage.session.set({ [SESSION_KEY]: dump }).catch(() => {});
    }, 400);
  };

  const restore = async (): Promise<void> => {
    try {
      const got = await browser.storage.session.get(SESSION_KEY);
      const dump = got[SESSION_KEY] as Record<string, CapturedStream[]> | undefined;
      if (!dump) return;
      for (const [tabId, list] of Object.entries(dump)) {
        if (store.has(Number(tabId))) continue;
        const m = new Map<string, CapturedStream>();
        for (const s of list) m.set(s.url, s);
        store.set(Number(tabId), m);
        updateBadge(Number(tabId));
      }
    } catch {
      /* first run, nothing stored */
    }
  };
  void restore();

  // -------------------------------------------------------- fetch + analyse --
  async function fetchAndParse(stream: CapturedStream) {
    const resp = await fetch(stream.url, { credentials: 'include' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} en récupérant le manifest`);
    const text = await resp.text();
    const contentType = resp.headers.get('content-type') ?? '';

    const isDash =
      /\.mpd($|[?#])/i.test(stream.url) || /dash\+xml/i.test(contentType) || text.includes('<MPD');
    if (isDash) {
      if (!text.includes('<MPD')) throw new Error('Réponse non reconnue comme manifest DASH');
      return parseMpd(text, stream.url);
    }
    if (!text.includes('#EXTM3U')) {
      throw new Error('La réponse ne ressemble pas à une playlist HLS');
    }
    return parsePlaylist(text, stream.url);
  }

  async function analyzeAndStore(tabId: number, url: string, force = false): Promise<void> {
    const stream = store.get(tabId)?.get(url);
    if (!stream) return;
    if (stream.analyzedAt && !force) return;
    try {
      const result = await fetchAndParse(stream);
      stream.type = result.kind;
      stream.variants = result.variants;
      stream.audio = result.audio;
      stream.drm = result.drm;
      stream.analyzeError = undefined;
    } catch (e) {
      stream.analyzeError = e instanceof Error ? e.message : String(e);
    }
    stream.analyzedAt = Date.now();
    schedulePersist();
  }

  const touch = (tabId: number, url: string): boolean => {
    const cur = store.get(tabId)?.get(url);
    if (!cur) return false;
    cur.lastSeen = Date.now();
    cur.count++;
    schedulePersist();
    return true;
  };

  const record = (
    tabId: number,
    url: string,
    info: { moduleId: string; title: string; referer?: string },
  ): void => {
    if (tabId < 0 || touch(tabId, url)) return;
    const now = Date.now();
    tabMap(tabId).set(url, {
      id: idFor(url),
      url,
      tabId,
      moduleId: info.moduleId,
      title: info.title,
      referer: info.referer,
      firstSeen: now,
      lastSeen: now,
      count: 1,
      type: 'unknown',
    });
    // Parse it now, while any single-use token in the URL is still fresh.
    void analyzeAndStore(tabId, url);
    updateBadge(tabId);
    schedulePersist();
  };

  // --------------------------------------------------------------- detection --
  const reqSpec = ['requestHeaders', ...(IS_CHROME ? ['extraHeaders'] : [])];

  const onRequest = async (d: {
    url: string;
    tabId: number;
    requestHeaders?: Array<{ name: string; value?: string }>;
  }): Promise<void> => {
    if (d.tabId < 0 || touch(d.tabId, d.url)) return;
    const tab = await browser.tabs.get(d.tabId).catch(() => null);
    const hit = matchStream({
      url: d.url,
      tabId: d.tabId,
      tabUrl: tab?.url,
      tabTitle: tab?.title,
      headers: headerMap(d.requestHeaders),
    });
    if (!hit) return;
    record(d.tabId, d.url, {
      moduleId: hit.module.id,
      title: hit.match.title,
      referer: hit.match.referer,
    });
  };

  browser.webRequest.onSendHeaders.addListener(
    (d) => {
      void onRequest(d);
    },
    { urls: allFilters },
    reqSpec as string[] as never,
  );

  // --------------------------------------------------------------- lifecycle --
  browser.tabs.onUpdated.addListener((tabId, info) => {
    // Top-level navigation → the old streams no longer belong to this page.
    if (info.status === 'loading' && info.url) {
      store.delete(tabId);
      updateBadge(tabId);
      schedulePersist();
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    store.delete(tabId);
    void removePlayerRule(tabId);
    schedulePersist();
  });

  // ----------------------------------------------- referer spoof for player --
  async function addPlayerRule(tabId: number, referer: string): Promise<void> {
    if (!IS_CHROME) return;
    const id = ruleIdSeq++;
    playerRules.set(tabId, id);

    let origin = '';
    try {
      origin = new URL(referer).origin;
    } catch {
      /* keep empty */
    }

    const requestHeaders: Array<{ header: string; operation: 'set'; value: string }> = [
      { header: 'referer', operation: 'set', value: referer },
    ];
    if (origin) requestHeaders.push({ header: 'origin', operation: 'set', value: origin });

    try {
      await browser.declarativeNetRequest.updateSessionRules({
        addRules: [
          {
            id,
            priority: 1,
            condition: {
              tabIds: [tabId],
              resourceTypes: ['xmlhttprequest', 'media', 'other'],
            },
            action: { type: 'modifyHeaders', requestHeaders },
          },
        ] as never,
      });
    } catch (e) {
      console.warn('[HLS Catcher] could not add referer rule', e);
    }
  }

  async function removePlayerRule(tabId: number): Promise<void> {
    const id = playerRules.get(tabId);
    if (id == null) return;
    playerRules.delete(tabId);
    try {
      await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] });
    } catch {
      /* rule already gone */
    }
  }

  // ---------------------------------------------------------------- messages --
  browser.runtime.onMessage.addListener((msg: Record<string, unknown>, _sender, sendResponse) => {
    void (async () => {
      try {
        const tabId = msg.tabId as number;

        switch (msg.type) {
          case 'getStreams': {
            const streams = [...tabMap(tabId).values()].sort((a, b) => b.lastSeen - a.lastSeen);
            sendResponse({ ok: true, streams });
            break;
          }
          case 'clearStreams': {
            store.delete(tabId);
            updateBadge(tabId);
            schedulePersist();
            sendResponse({ ok: true, streams: [] });
            break;
          }
          case 'analyze': {
            const stream = [...tabMap(tabId).values()].find((x) => x.id === msg.streamId);
            if (!stream) {
              sendResponse({ ok: false, error: 'Flux introuvable' });
              break;
            }
            await analyzeAndStore(tabId, stream.url, true);
            sendResponse({ ok: !stream.analyzeError, stream, error: stream.analyzeError });
            break;
          }
          case 'openPlayer': {
            const referer = (msg.referer as string | undefined) || undefined;
            const url =
              browser.runtime.getURL('/player.html' as never) +
              `?src=${encodeURIComponent(msg.url as string)}` +
              (referer ? `&referer=${encodeURIComponent(referer)}` : '') +
              (msg.title ? `&title=${encodeURIComponent(msg.title as string)}` : '');
            const tab = await browser.tabs.create({ url });
            if (tab.id != null && referer) await addPlayerRule(tab.id, referer);
            sendResponse({ ok: true });
            break;
          }
          default:
            sendResponse({ ok: false, error: 'Message inconnu' });
        }
      } catch (e) {
        sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    })();

    return true; // keep the message channel open for the async reply
  });
});
