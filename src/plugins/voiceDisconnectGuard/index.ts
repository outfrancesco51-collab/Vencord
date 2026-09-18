import { Devs } from "@utils/constants";
/*
 * Vencord - VoiceDisconnectGuard
 * Monitora lo stato vocale e preserva l'ID del canale per riconnessione immediata in caso di drop di rete.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelRouter, ChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    autoReconnect: {
        description: "Riconnetti automaticamente al canale se la disconnessione avviene per errore di rete",
        type: OptionType.BOOLEAN,
        default: false
    },
    savedChannelId: {
        description: "ID del canale vocale memorizzato dal Guard",
        type: OptionType.STRING,
        default: ""
    }
});

let manualDisconnect = false;

export default definePlugin({
    name: "VoiceDisconnectGuard",
    description: "Protezione attiva contro le disconnessioni vocali accidentali. Memorizza l'ID del canale e consente la riconnessione istantanea in 1 clic.",
    tags: ["Voice", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    flux: {
        VOICE_CHANNEL_SELECT({ channelId }: { channelId?: string | null; }) {
            if (channelId) {
                manualDisconnect = false;
                settings.store.savedChannelId = channelId;
            } else {
                manualDisconnect = true;
            }
        },

        RTC_CONNECTION_STATE({ state }: { state: string; }) {
            if (state === "DISCONNECTED" && !manualDisconnect && settings.store.savedChannelId) {
                const targetChannel = settings.store.savedChannelId;
                showToast("⚠️ Connessione vocale interrotta! Canale ID salvato: " + targetChannel, Toasts.Type.FAILURE);

                if (settings.store.autoReconnect) {
                    setTimeout(() => {
                        try {
                            ChannelRouter?.transitionToChannel?.(targetChannel);
                            showToast("🔄 Auto-riconnessione in corso...", Toasts.Type.MESSAGE);
                        } catch {}
                    }, 2000);
                }
            }
        }
    },

    toolboxActions: {
        "🛡️ Voice Guard: Riconnetti Canale": () => {
            const chId = settings.store.savedChannelId;
            if (!chId) {
                showToast("Nessun canale salvato.", Toasts.Type.FAILURE);
                return;
            }
            try {
                ChannelRouter?.transitionToChannel?.(chId);
                showToast(`Riconnessione al canale ${chId}`, Toasts.Type.SUCCESS);
            } catch {
                navigator.clipboard.writeText(chId);
                showToast(`Copiato ID: ${chId}`, Toasts.Type.SUCCESS);
            }
        }
    }
});
