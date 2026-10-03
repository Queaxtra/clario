export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'clario.theme';
export const DARK_CLASS = 'dark';

export function getSystemTheme(): Theme {
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme | null {
	try {
		const value = localStorage.getItem(THEME_STORAGE_KEY);
		return value === 'light' || value === 'dark' ? value : null;
	} catch {
		return null;
	}
}

// stored choice wins, otherwise follow the operating system
export function resolveTheme(): Theme {
	return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
	const root = document.documentElement;
	root.classList.toggle(DARK_CLASS, theme === 'dark');
	root.style.colorScheme = theme;
}

export function saveTheme(theme: Theme): void {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// storage is unavailable in private mode or when the quota is full
	}
}

export function setTheme(theme: Theme): void {
	applyTheme(theme);
	saveTheme(theme);
}

export function toggleTheme(current: Theme): Theme {
	const next = current === 'dark' ? 'light' : 'dark';
	setTheme(next);
	return next;
}
