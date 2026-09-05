import type { ExternalApp } from "@superset/local-db";

export function filterByInstalled<T extends { id: ExternalApp }>(
	apps: readonly T[],
	installed: ReadonlySet<ExternalApp> | null | undefined,
): T[] {
	if (!installed) return [...apps];
	return apps.filter((app) => installed.has(app.id));
}

export function resolveOpenInApp(
	saved: ExternalApp | null | undefined,
	installed: ReadonlySet<ExternalApp> | null | undefined,
	fallback: ExternalApp = "finder",
): ExternalApp {
	if (saved && (!installed || installed.has(saved))) return saved;
	return fallback;
}
