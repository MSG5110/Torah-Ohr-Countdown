import type { Settings } from './engine';
import type { Photo } from './storage';
import type { PrizeRun, PreparedPrize } from './prizeEngine';
export type CloudPhoto = Omit<Photo,'blob'|'thumbnail'|'remoteUrl'|'thumbnailUrl'> & { mediaPath:string;thumbnailPath?:string;bytes:number;countdownSeconds?:number;revealSeconds?:number;revealText?:string };
export type SharedEvent = {version:1;revision:string;updatedAt:number;settings:Settings;photos:CloudPhoto[];prizes:CloudPhoto[];run:PrizeRun|null;prepared:PreparedPrize|null};
export type SharedPatch = Partial<Pick<SharedEvent,'photos'|'prizes'|'run'|'prepared'>> & {settings?:Partial<Settings>};
export const mediaPathValid = (s:unknown):s is string => typeof s==='string' && /^media\/[a-f0-9-]{36}\.(?:png|jpe?g|webp|svg)$/.test(s);
