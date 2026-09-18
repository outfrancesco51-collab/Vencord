/*
 * Vencord Updater (Disabled by Antigravity)
 */

import { Logger } from "./Logger";

export const UpdateLogger = new Logger("Updater", "white");
export let isOutdated = false;
export let isNewer = false;
export let updateError: any;
export let changes: any[] = [];

export async function checkUpdates() {
    return { hasUpdate: false, message: "Aggiornamenti bloccati dalla versione modificata" };
}

export async function checkForUpdates() {
    return false;
}

export async function update() {
    return false;
}

export const UPDATER_DISABLED = true;

export const getRepo = async () => "https://github.com/Vendicated/Vencord.git";

export async function maybePromptToUpdate(confirmMessage: string, checkForDev = false) {
    return;
}
