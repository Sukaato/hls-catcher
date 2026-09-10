# HLS Catcher

Chrome extension (MV3, built with [WXT](https://wxt.dev)) that **detects the HLS stream** of
a supported site and lets you **open it alone in a tab**, in a built-in player, with a
**quality picker**.

Supported sites are **modules** (`lib/modules/`). Shipped:

| Module | Watches | Title |
| --- | --- | --- |
| `twitch` | `usher.ttvnw.net/api/…/channel/hls/<channel>.m3u8` (the master playlist) | channel name |
| `crunchyroll` | `*.m3u8` requests from a `crunchyroll.com` tab (`*.vrv.co`, `*.crunchyrollsvc.com`) | tab title, cleaned up |

## What it does

- The service worker listens to `webRequest` on the **union of every module's filters**. For
  each matching request it asks the modules, in order, whether it's a capturable stream; the
  first match wins and is stored per tab with its module id + a display title. A badge on the
  icon shows how many streams were detected.
- That playlist is **fetched and parsed immediately** (while any single-use token in the URL
  is still fresh). The result is kept in `storage.session` so it survives the service worker
  being suspended.
- The popup shows, per stream (tagged with its site):
  - **Open (auto + quality menu)** → `hls.js` player on the master playlist, automatic
    quality + a selector inside the player.
  - the quality list (`1080p60 (source) · 6.5 Mb/s`, `720p60 …`, `Audio Only …`), each with
    its own **Open** button (quality locked).
  - **Copy** / **Raw URL** → direct link for VLC, mpv, `ffmpeg`, `yt-dlp`, etc.
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
| `entrypoints/player/` | `hls.js` player page (`player.html?src=…&referer=…`) |
| `lib/modules/` | One file per site (`twitch.ts`, `crunchyroll.ts`) + `index.ts` registry; `types.ts` is the `StreamModule` contract |
| `lib/m3u8.ts` | Master playlist parser (handles Twitch `#EXT-X-MEDIA:TYPE=VIDEO` names) |
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
- Crunchyroll serves most catalogue content with Widevine DRM; `hls.js` can't play those.
  DRM-free manifests (trailers, some regions/titles) work. Otherwise: "Raw URL" + VLC.
- The player cannot play a stream behind a geo-block or account authentication. In that
  case: "Raw URL" + VLC.
- The store lives in memory in the service worker, with a copy in `storage.session` (lost
  when the browser closes, not when the SW is suspended).
- Icons are the WXT template ones — replace them in `public/icon/`.

## Adding a site (modules)

Create `lib/modules/<site>.ts` exporting a `StreamModule` (`id`, `label`, `hostPermissions`,
`filters`, `match()`), then add it to the array in `lib/modules/index.ts`. `match()` gets
`{ url, tabId, tabUrl, tabTitle, headers }` and returns `{ title, referer, kind }` or `null`.
`background.ts`, the popup and the player stay untouched; `host_permissions` updates itself.
