export type Dictionary = Record<string, unknown>;
export type Translations = Record<string, Dictionary>;

// resolve a dot separated key path, returns undefined when any segment is missing
export function lookup(dictionary: Dictionary, path: string): unknown {
	let node: unknown = dictionary;
	for (const part of path.split('.')) {
		if (typeof node !== 'object' || node === null) return undefined;
		node = (node as Dictionary)[part];
	}
	return node;
}

// replace {name} placeholders, keep the placeholder when a param is missing
export function interpolate(template: string, params: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in params ? String(params[name]) : match
	);
}

// current locale first, then the fallback locale, then the raw key
export function translate(
	translations: Translations,
	locale: string,
	fallback: string,
	key: string,
	params?: Record<string, string | number>
): string {
	const value =
		lookup(translations[locale] ?? {}, key) ?? lookup(translations[fallback] ?? {}, key);
	if (typeof value !== 'string') return key;
	return params ? interpolate(value, params) : value;
}
