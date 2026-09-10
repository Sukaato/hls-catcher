# HLS Catcher

Extension Chrome (MV3, construite avec [WXT](https://wxt.dev)) qui **repère le stream HLS
d'une chaîne Twitch** et propose de l'**ouvrir seul dans un onglet**, dans un lecteur
intégré, avec **choix de la qualité**.

Ciblé Twitch : seule la playlist maître `usher.ttvnw.net/api/…/channel/hls/<chaîne>.m3u8`
est interceptée (celle qui liste toutes les qualités).

## Ce que ça fait

- Le service worker écoute `webRequest` **uniquement sur `usher.ttvnw.net`** et retient
  l'URL de la playlist maître, par onglet, avec le nom de la chaîne extrait de l'URL. Un
  badge sur l'icône indique le nombre de streams détectés.
- Cette playlist est **téléchargée et parsée immédiatement** (pendant que son token est
  encore frais). Le résultat est gardé dans `storage.session` pour survivre à la mise en
  veille du service worker.
- Le popup affiche, par chaîne :
  - **Ouvrir (auto + menu qualité)** → lecteur `hls.js` sur la playlist maître, qualité
    automatique + sélecteur dans le lecteur.
  - la liste des qualités (`1080p60 (source) · 6.5 Mb/s`, `720p60 …`, `Audio Only …`),
    chacune avec son bouton **Ouvrir** (qualité figée).
  - **Copier** / **URL brute** → lien direct pour VLC, mpv, `ffmpeg`, `yt-dlp`, etc.
- À l'ouverture du lecteur, une règle `declarativeNetRequest` de session ré-injecte le
  `Referer` / `Origin` `https://www.twitch.tv/…` sur les requêtes de cet onglet. La règle
  est retirée à la fermeture de l'onglet.

## Développement

```bash
bun install
bun run dev          # lance Chrome avec l'extension en HMR
bun run compile      # vérif TypeScript (vue-tsc)
bun run check        # Biome format + lint (--write)
bun run build        # build de prod -> .output/chrome-mv3
bun run zip          # paquet distribuable -> .output/hls-catcher-<version>-chrome.zip
```

Charger manuellement : `chrome://extensions` → mode développeur → « Charger l'extension non
empaquetée » → dossier `.output/chrome-mv3`.

## CI/CD (GitHub Actions)

| Workflow | Déclencheur | Rôle |
| --- | --- | --- |
| `quality.yml` | push `main`/`feat/**`/`fix/**`, PR | Biome format + lint + `vue-tsc` (action composite `actions/quality`) |
| `build.yml` | idem | `wxt zip` en matrice **chrome / firefox / edge**, artefacts uploadés |
| `audit.yml` | hebdo + manuel | `bun audit` (non bloquant) |
| `codeql.yml` | push/PR `main` + hebdo | Analyse CodeQL JS/TS |
| `release-dev.yml` | ouverture/màj d'une PR | build dev `0.0.0-dev.<run>.<sha>` des 3 navigateurs + commentaire PR avec le lien des artefacts |
| `release.yml` | **manuel** (`workflow_dispatch`) | `bump` major/minor/patch × `pre_release` none/alpha/beta/rc → calcule la version, bumpe `package.json`, commit + tag `vX.Y.Z`, changelog depuis les commits (Conventional Commits), **GitHub Release avec les 3 `.zip` attachés** (marquée _pre-release_ si `pre_release != none`) |
| `release-cleanup.yml` | quotidien + manuel | supprime les pre-releases GitHub (et leurs tags) de plus de 30 jours |

Aucun secret à configurer : tout passe par le `GITHUB_TOKEN` par défaut. Le changelog est
piloté par `.github/changelog-config.json` (préfixes `feat:`, `fix:`, `perf:`, …).

## Structure

| Chemin | Rôle |
| --- | --- |
| `entrypoints/background.ts` | Interception `usher.ttvnw.net`, parse chaîne, stockage par onglet, badge, spoof `Referer`, API de messages |
| `entrypoints/popup/` | UI Vue : streams par chaîne + qualités |
| `entrypoints/player/` | Page lecteur `hls.js` (`player.html?src=…&referer=…`) |
| `lib/m3u8.ts` | Parseur de playlist maître (gère les noms Twitch `#EXT-X-MEDIA:TYPE=VIDEO`) |
| `lib/types.ts` | Types partagés |

Permissions : `webRequest`, `tabs`, `storage`, `declarativeNetRequestWithHostAccess` ;
hôtes `*://*.twitch.tv/*` et `*://*.ttvnw.net/*`.

## Limites connues

- **La playlist maître doit passer pendant que l'extension écoute.** Elle n'est demandée
  qu'une fois au lancement du stream ; si l'extension a été activée après, recharge
  l'onglet — la nouvelle maître sera captée, parsée et persistée.
- Sans être connecté à Twitch, les résolutions > 1080p (1440p/4K) sont absentes de la
  playlist — c'est Twitch qui les retire, pas l'extension.
- Le lecteur ne relit pas un stream soumis à un blocage géographique ou à une
  authentification de compte. Dans ce cas : « URL brute » + VLC.
- Le stock vit en mémoire dans le service worker, avec une copie dans `storage.session`
  (perdue à la fermeture du navigateur, pas à la mise en veille du SW).
- Les icônes sont celles du template WXT — à remplacer dans `public/icon/`.

## Rouvrir à d'autres plateformes

Tout le filtrage Twitch tient dans `entrypoints/background.ts` (`USHER_URLS`,
`CHANNEL_RE`, `twitchChannel`) et `host_permissions` dans `wxt.config.ts`. Le parseur et le
lecteur sont génériques.
