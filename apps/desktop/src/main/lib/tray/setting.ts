import { settings } from "@superset/local-db";
import { localDb } from "main/lib/local-db";
import { PLATFORM } from "shared/constants";
import { resolveKeepInTray } from "./keep-in-tray";

export function isKeepInTrayEnabled(): boolean {
	try {
		const row = localDb.select().from(settings).get();
		return resolveKeepInTray(row?.keepInTray, PLATFORM.IS_LINUX);
	} catch {
		return resolveKeepInTray(null, PLATFORM.IS_LINUX);
	}
}
