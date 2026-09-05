import type { ExternalApp } from "@superset/local-db";
import { useMemo } from "react";
import { electronTrpc } from "renderer/lib/electron-trpc";

const LINUX_PLACEHOLDER: ExternalApp[] = ["finder"];

export function useInstalledExternalApps(): ReadonlySet<ExternalApp> | null {
	const { data } = electronTrpc.external.listInstalledApps.useQuery(undefined, {
		staleTime: 60_000,
		placeholderData:
			process.platform === "linux" ? LINUX_PLACEHOLDER : undefined,
	});
	return useMemo(() => (data ? new Set(data) : null), [data]);
}
