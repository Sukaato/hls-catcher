import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'HLS Catcher',
    description: 'Ouvre le stream Twitch (HLS) seul dans un onglet, avec le choix de la qualité.',
    // usher.ttvnw.net = master playlist ; *.ttvnw.net = playlists de qualité + segments
    // (nécessaire pour l'observation webRequest et la règle Referer du lecteur).
    permissions: ['webRequest', 'tabs', 'storage', 'declarativeNetRequestWithHostAccess'],
    host_permissions: ['*://*.twitch.tv/*', '*://*.ttvnw.net/*'],
    action: {
      default_title: 'HLS Catcher',
    },
  },
});
