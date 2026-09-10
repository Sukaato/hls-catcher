# HLS Catcher

Chrome extension (MV3, built with [WXT](https://wxt.dev)) that **detects the video stream**
(HLS or DASH) of a supported site and lets you **open it alone in a tab**, in a built-in
player, with a **quality picker**.

Supported sites are **modules** (`lib/modules/`). Shipped:

| Module | Watches | Format | Title |
| --- | --- | --- | --- |
| `twitch` | `usher.ttvnw.net/api/…/channel/hls/<channel>.m3u8` | HLS, clear | channel name |
| `crunchyroll` | `*.crunchyroll.com/playback/…/manifest/…mpd` | DASH, **Widevine DRM** | tab title (+ subtitle locale) |

## What it does

- The service worker listens to `webRequest` on the **union of every module's filters**. For
  each matching request it asks the modules, in order, whether it's a capturable stream; the
  first match wins and is stored per tab with its module id + a display title. A badge on the
  icon shows how many streams were detected.
- The manifest is **fetched and parsed immediately** (while any single-use token in the URL
  is still fresh) — `.m3u8` via the HLS parser, `.mpd` via a small regex DASH parser that
  also flags `<ContentProtection>` (DRM). The result is kept in `storage.session` so it
  survives the service worker being suspended.
- The popup shows, per stream (tagged with its site):
  - **Open** → built-in player: `hls.js` for HLS, lazy-loaded `shaka-player` for DASH, with
    a quality selector. DRM streams show a 🔒 badge and only offer **Copy manifest URL**.
  - the quality list (`1080p60 (source) · 6.5 Mb/s`, `1080p · 11.4 Mb/s`, …); for HLS each
    line has its own **Open** button (quality locked).
  - **Copy** / **Raw URL** → for VLC, mpv, `ffmpeg`, `yt-dlp`, `N_m3u8DL-RE`, etc.
- When the player opens, a `declarativeNetRequest` session rule re-injects the module's
  `Referer` / `Origin` on that tab's requests. The rule is removed when the tab closes.

## Development

```bash
bun install
bun run dev          # launches Chrome with the extension in HMR
bun run compile      # TypeScript check (vue-tsc)
bun run check        # Biome format + lint (--write)
bun run build        # production build -> .output/chrome-mv3
bun run zip          # distributable package -> .output/hls-catcher-<version>-chrome.zip
```

Load manually: `chrome://extensions` → developer mode → "Load unpacked" →
`.output/chrome-mv3` folder.

## CI/CD (GitHub Actions)

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `quality.yml` | push to `main`/`feat/**`/`fix/**`, PR | Biome format + lint + `vue-tsc` (composite action `actions/quality`) |
| `build.yml` | same | `wxt zip` across a **chrome / firefox / edge** matrix, artifacts uploaded |
| `audit.yml` | weekly + manual | `bun audit` (non-blocking) |
| `codeql.yml` | push/PR to `main` + weekly | CodeQL JS/TS analysis |
| `release-dev.yml` | PR opened/updated | dev build `0.0.0-dev.<run>.<sha>` for the 3 browsers + a PR comment with the artifacts link |
| `release.yml` | **manual** (`workflow_dispatch`) | `bump` major/minor/patch × `pre_release` none/alpha/beta/rc → computes the version, bumps `package.json`, commit + tag `vX.Y.Z`, changelog from commits (Conventional Commits), **GitHub Release with the 3 `.zip` files attached** (marked _pre-release_ when `pre_release != none`) |
| `release-cleanup.yml` | daily + manual | deletes GitHub pre-releases (and their tags) older than 30 days |

No secrets to configure: everything runs on the default `GITHUB_TOKEN`. The changelog is
driven by `.github/changelog-config.json` (prefixes `feat:`, `fix:`, `perf:`, …).

`release.yml` pushes the version-bump commit and tag, so enable
**Settings → Actions → General → Workflow permissions → "Read and write"**.

## Layout

| Path | Role |
| --- | --- |
| `entrypoints/background.ts` | webRequest interception, per-tab store, badge, immediate parse, `Referer` spoof, message API — **no site knowledge** |
| `entrypoints/popup/` | Vue UI: streams per site + qualities |
| `entrypoints/player/` | player page (`player.html?src=…&referer=…`): `hls.js`, or `shaka-player` via dynamic `import()` when `src` ends in `.mpd` |
| `lib/modules/` | One file per site (`twitch.ts`, `crunchyroll.ts`) + `index.ts` registry; `types.ts` is the `StreamModule` contract |
| `lib/m3u8.ts` | HLS playlist parser (handles Twitch `#EXT-X-MEDIA:TYPE=VIDEO` names) |
| `lib/mpd.ts` | DASH manifest parser (regex — no `DOMParser` in the SW); flags DRM |
| `lib/types.ts` | Shared types (`CapturedStream`, `Variant`, …) |

Permissions: `webRequest`, `tabs`, `storage`, `declarativeNetRequestWithHostAccess`.
`host_permissions` is the union of every module's `hostPermissions`, injected into the
manifest from `wxt.config.ts`.

## Known limitations

- **The playlist must go through while the extension is listening.** A Twitch master is
  requested only once when playback starts; if the extension was enabled afterwards, reload
  the tab — it will be captured, parsed and persisted.
- Without being logged into Twitch, resolutions above 1080p (1440p/4K) are absent from the
  playlist — that's Twitch removing them, not the extension.
- **Crunchyroll is Widevine DRM** — `shaka-player` (and any tab-based player) can't
  decrypt it. The extension still surfaces the `.mpd` URL and the quality list; feed the
  URL to a DRM-capable tool (`yt-dlp`, `N_m3u8DL-RE`, `devine`, …). Non-DRM DASH plays
  normally.
- The player cannot play any stream behind a geo-block or account authentication. In that
  case: "Raw URL" / "Copy" + an external tool.
- The store lives in memory in the service worker, with a copy in `storage.session` (lost
  when the browser closes, not when the SW is suspended).
- Icons are the WXT template ones — replace them in `public/icon/`.

## Adding a site (modules)

Create `lib/modules/<site>.ts` exporting a `StreamModule` (`id`, `label`, `hostPermissions`,
`filters`, `match()`), then add it to the array in `lib/modules/index.ts`. `match()` gets
`{ url, tabId, tabUrl, tabTitle, headers }` and returns `{ title, referer, kind }` or
`null` (`kind` is `'master' | 'media' | 'dash'`; helpers `isM3u8` / `isMpd` in
`modules/types.ts`). `background.ts`, the popup and the player stay untouched;
`host_permissions` updates itself.
