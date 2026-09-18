import { Devs } from "@utils/constants";
/*
 * Vencord - VoiceDurationTracker
 * Monitora il tempo trascorso nella chiamata vocale attuale e tiene traccia dei minuti totali in voce.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    totalVoiceMinutes: {
        description: "Minuti totali trascorsi in chiamata vocale (accumulati)",
        type: OptionType.NUMBER,
        default: 0
    },
    showSessionSummaryOnLeave: {
        description: "Mostra notifica di riepilogo durata quando esci da un canale vocale",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let sessionStartTime: number | null = null;
let intervalId: any = null;

function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
}

export default definePlugin({
    name: "VoiceDurationTracker",
    description: "Traccia la durata della chiamata vocale corrente e accumula le statistiche del tempo totale trascorso nei canali vocali.",
    tags: ["Voice", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: any[]; }) {
            const myId = UserStore.getCurrentUser()?.id;
            if (!myId || !voiceStates) return;

            for (const state of voiceStates) {
                if (state.userId !== myId) continue;

                const connected = Boolean(state.channelId);

                // Entrato in vocale
                if (connected && !sessionStartTime) {
                    sessionStartTime = Date.now();
                }
                // Uscito da vocale
                else if (!connected && sessionStartTime) {
                    const elapsedMs = Date.now() - sessionStartTime;
                    const elapsedSecs = Math.floor(elapsedMs / 1000);
                    const elapsedMins = Math.floor(elapsedSecs / 60);

                    settings.store.totalVoiceMinutes += elapsedMins;

                    if (settings.store.showSessionSummaryOnLeave && elapsedSecs >= 5) {
                        showToast(`⏱️ Chiamata terminata! Durata: ${formatDuration(elapsedSecs)} (Totale: ${settings.store.totalVoiceMinutes} min)`, Toasts.Type.MESSAGE);
                    }

                    sessionStartTime = null;
                }
            }
        }
    },

    toolboxActions: {
        "⏱️ Durata Chiamata Attuale": () => {
            if (!sessionStartTime) {
                showToast(`Non sei in chiamata vocale. Minuti totali registrati: ${settings.store.totalVoiceMinutes} min.`, Toasts.Type.MESSAGE);
                return;
            }
            const currentSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
            showToast(`🎙️ Sei in chiamata da: ${formatDuration(currentSeconds)}`, Toasts.Type.SUCCESS);
        }
    }
});
