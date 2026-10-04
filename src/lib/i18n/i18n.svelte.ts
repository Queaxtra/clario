import { translate, type Translations } from './translate';
import de from './translations/de.json';
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import it from './translations/it.json';
import pt from './translations/pt.json';
import ru from './translations/ru.json';
import tr from './translations/tr.json';

export type Locale = 'en' | 'tr' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'ru';

export const LOCALE_STORAGE_KEY = 'clario.locale';
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALES: readonly Locale[] = ['en', 'tr', 'de', 'fr', 'es', 'it', 'pt', 'ru'];

const translations: Translations = { en, tr, de, fr, es, it, pt, ru };

// engine errors are plain strings and carry no locale, map the known ones back
const ERROR_KEYS: Record<string, string> = {
	'model is not loaded': 'errors.modelNotLoaded',
	'model session not found': 'errors.modelSessionNotFound',
	'unable to create 2d context': 'errors.canvasContext',
	'background image could not be loaded': 'errors.backgroundImage',
	'image unavailable': 'errors.imageUnavailable',
	'not an image': 'errors.notAnImage',
	'encode failed': 'errors.encodeFailed',
	unsupported: 'errors.unsupported'
};

let locale = $state<Locale>(DEFAULT_LOCALE);
let initialized = false;

export function getLocale(): Locale {
	return locale;
}

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function getStoredLocale(): Locale | null {
	try {
		const value = localStorage.getItem(LOCALE_STORAGE_KEY);
		return isLocale(value) ? value : null;
	} catch {
		return null;
	}
}

// stored choice wins, otherwise follow the browser language
export function resolveLocale(): Locale {
	const stored = getStoredLocale();
	if (stored) return stored;
	if (typeof navigator !== 'undefined') {
		const preferred = navigator.language?.slice(0, 2).toLowerCase();
		if (isLocale(preferred)) return preferred;
	}
	return DEFAULT_LOCALE;
}

export function saveLocale(next: Locale): void {
	try {
		localStorage.setItem(LOCALE_STORAGE_KEY, next);
	} catch {
		// storage is unavailable in private mode or when the quota is full
	}
}

export function applyLocale(next: Locale): void {
	if (typeof document !== 'undefined') document.documentElement.lang = next;
}

export function setLocale(next: Locale): void {
	if (!isLocale(next) || next === locale) return;
	locale = next;
	saveLocale(next);
	applyLocale(next);
}

// sync once after hydration, the pre-paint script already set the html lang
export function initLocale(): void {
	if (initialized) return;
	initialized = true;
	locale = resolveLocale();
	applyLocale(locale);
}

export function t(key: string, params?: Record<string, string | number>): string {
	return translate(translations, locale, DEFAULT_LOCALE, key, params);
}

export function tError(message: string): string {
	const key = ERROR_KEYS[message];
	return key ? t(key) : message;
}
