export { es } from './es';
export { pt } from './pt';
export { en } from './en';
export { zh } from './zh';

import { es } from './es';
import { pt } from './pt';
import { en } from './en';
import { zh } from './zh';

export const translations = { es, pt, en, zh } as const;
export type Translations = typeof es;
export type Locale = 'es' | 'pt' | 'en' | 'zh';
