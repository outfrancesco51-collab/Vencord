import { Devs } from "@utils/constants";
/*
 * Vencord - AutoAfkMute
 * Muta automaticamente il microfono quando Discord o il sistema entra in IDLE, e ripristina lo stato al ritorno.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { MediaEngineStore, showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    muteOnIdle: {
        description: "Muta il microfono quando diventi Inattivo (IDLE)",
        type: OptionType.BOOLEAN,
        default: true
    },
    deafenOnIdle: {
        description: "Rendi anche sordo l'audio in chiamata quando IDLE",
        type: OptionType.BOOLEAN,
        default: false
    },
    showToastOnMute: {
        description: "Mostra notifica toast quando AutoAfkMute interviene",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let wasMutedBeforeIdle = false;

export default definePlugin({
    name: "AutoAfkMute",
    description: "Muta automaticamente il microfono o rende sordi quando sei AFK/Inattivo e ripristina il microfono quando torni attivo.",
    tags: ["Voice", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    flux: {
        IDLE({ idle }: { idle: boolean; }) {
            if (!settings.store.muteOnIdle) return;

            const isCurrentlyMuted = MediaEngineStore.isSelfMute();

            if (idle) {
                wasMutedBeforeIdle = isCurrentlyMuted;
                if (!isCurrentlyMuted) {
                    if ((MediaEngineStore as any).setSelfMute) {
                        (MediaEngineStore as any).setSelfMute(true);
                    }
                    if (settings.store.showToastOnMute) {
                        showToast("💤 AFK Rilevato: Microfono mutato automaticamente", Toasts.Type.MESSAGE);
                    }
                }
            } else {
                // Al ritorno dall'idle, se era stato mutato da noi, ripristina
                if (!wasMutedBeforeIdle && MediaEngineStore.isSelfMute()) {
                    if ((MediaEngineStore as any).setSelfMute) {
                        (MediaEngineStore as any).setSelfMute(false);
                    }
                    if (settings.store.showToastOnMute) {
                        showToast("👋 Bentornato: Microfono riattivato", Toasts.Type.SUCCESS);
                    }
                }
            }
        }
    }
});
