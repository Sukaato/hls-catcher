import { defineConfig } from 'wxt';
import { allHostPermissions } from './lib/modules';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'HLS Catcher',
    description: 'Open a Twitch or Crunchyroll HLS stream alone in a tab, with a quality picker.',
    permissions: ['webRequest', 'tabs', 'storage', 'declarativeNetRequestWithHostAccess'],
    // One entry per site module (see lib/modules/*): needed for webRequest
    // observation, the background manifest fetch and the player's Referer rule.
    host_permissions: allHostPermissions,
    action: {
      default_title: 'HLS Catcher',
    },
  },
  zip: {
    // Local capture files must never end up in the Firefox sources bundle.
    excludeSources: ['**/*.har'],
  },
});
