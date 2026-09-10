import { crunchyroll } from './crunchyroll';
import { twitch } from './twitch';
import type { MatchContext, ModuleMatch, StreamModule } from './types';

/** Every registered site module. Add new platforms here. */
export const modules: StreamModule[] = [twitch, crunchyroll];

const unique = (values: string[]): string[] => [...new Set(values)];

/** Union of every module's `host_permissions` — fed to the manifest. */
export const allHostPermissions = unique(modules.flatMap((m) => m.hostPermissions));

/** Union of every module's `webRequest` filters. */
export const allFilters = unique(modules.flatMap((m) => m.filters));

export interface StreamHit {
  module: StreamModule;
  match: ModuleMatch;
}

/** Ask each module, in order, whether a seen request is a capturable stream. */
export function matchStream(context: MatchContext): StreamHit | null {
  for (const module of modules) {
    const match = module.match(context);
    if (match) return { module, match };
  }
  return null;
}

export type { MatchContext, ModuleMatch, StreamModule } from './types';
