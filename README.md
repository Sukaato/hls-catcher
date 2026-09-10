# HLS Catcher

Chrome extension (MV3, built with [WXT](https://wxt.dev)) that **detects the HLS stream of a
Twitch channel** and lets you **open it alone in a tab**, in a built-in player, with a
**quality picker**.

Twitch-focused: only the master playlist
`usher.ttvnw.net/api/…/channel/hls/<channel>.m3u8` is intercepted (the one that lists every
quality).

## What it does

- The service worker listens to `webRequest` **only on `usher.ttvnw.net`** and keeps the
  master playlist URL, per tab, with the channel name parsed from the URL. A badge on the
  icon shows how many streams were detected.
- That playlist is **fetched and parsed immediately** (while its token is still fresh). The
  result is kept in `storage.session` so it survives the service worker being suspended.
- The popup shows, per channel:
  - **Open (auto + quality menu)** → `hls.js` player on the master playlist, automatic
    quality + a selector inside the player.
  - the quality list (`1080p60 (source) · 6.5 Mb/s`, `720p60 …`, `Audio Only …`), each with
    its own **Open** button (quality locked).
  - **Copy** / **Raw URL** → direct link for VLC, mpv, `ffmpeg`, `yt-dlp`, etc.
- When the player opens, a `declarativeNetRequest` session rule re-injects the
  `Referer` / `Origin` `https://www.twitch.tv/…` on that tab's requests. The rule is removed
  when the tab closes.

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
| `entrypoints/background.ts` | `usher.ttvnw.net` interception, channel parsing, per-tab store, badge, `Referer` spoof, message API |
| `entrypoints/popup/` | Vue UI: streams per channel + qualities |
| `entrypoints/player/` | `hls.js` player page (`player.html?src=…&referer=…`) |
| `lib/m3u8.ts` | Master playlist parser (handles Twitch `#EXT-X-MEDIA:TYPE=VIDEO` names) |
| `lib/types.ts` | Shared types |

Permissions: `webRequest`, `tabs`, `storage`, `declarativeNetRequestWithHostAccess`; hosts
`*://*.twitch.tv/*` and `*://*.ttvnw.net/*`.

## Known limitations

- **The master playlist must go through while the extension is listening.** It's requested
  only once when playback starts; if the extension was enabled afterwards, reload the tab —
  the new master will be captured, parsed and persisted.
- Without being logged into Twitch, resolutions above 1080p (1440p/4K) are absent from the
  playlist — that's Twitch removing them, not the extension.
- The player cannot play a stream behind a geo-block or account authentication. In that
  case: "Raw URL" + VLC.
- The store lives in memory in the service worker, with a copy in `storage.session` (lost
  when the browser closes, not when the SW is suspended).
- Icons are the WXT template ones — replace them in `public/icon/`.

## Re-opening to other platforms

All the Twitch filtering lives in `entrypoints/background.ts` (`USHER_URLS`, `CHANNEL_RE`,
`twitchChannel`) and `host_permissions` in `wxt.config.ts`. The parser and the player are
generic.
