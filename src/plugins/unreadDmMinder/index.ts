import { Devs } from "@utils/constants";
/*
 * Vencord - UnreadDmMinder
 * Invia un discreto promemoria se ci sono messaggi diretti (DM) non letti da più di un certo tempo.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    reminderIntervalMinutes: {
        description: "Intervallo del promemoria per i DM non letti (in minuti)",
        type: OptionType.NUMBER,
        default: 15
    },
    enabled: {
        description: "Abilita promemoria periodico per DM in sospeso",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let intervalTimer: any = null;
let unreadDmCount = 0;

export default definePlugin({
    name: "UnreadDmMinder",
    description: "Ricorda con discrezione se hai conversazioni private (DM) ancora non lette dopo un certo numero di minuti.",
    tags: ["Notifications", "Utility", "Friends"],
    authors: [Devs.Antigravity],
    settings,

    flux: {
        MESSAGE_CREATE({ message }: { message: any; }) {
            // Se è un DM (channel non guild) ed è inviato da qualcun altro
            if (!message?.guild_id && message?.author?.id !== UserStore.getCurrentUser()?.id) {
                unreadDmCount++;
            }
        },
        CHANNEL_SELECT() {
            unreadDmCount = Math.max(0, unreadDmCount - 1);
        }
    },

    start() {
        const intervalMs = Math.max(1, settings.store.reminderIntervalMinutes) * 60 * 1000;
        intervalTimer = setInterval(() => {
            if (settings.store.enabled && unreadDmCount > 0) {
                showToast(`📩 Hai messaggi privati non letti in attesa (${unreadDmCount})!`, Toasts.Type.MESSAGE);
            }
        }, intervalMs);
    },

    stop() {
        if (intervalTimer) {
            clearInterval(intervalTimer);
            intervalTimer = null;
        }
    }
});
