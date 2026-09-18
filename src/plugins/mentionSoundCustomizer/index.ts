import { Devs } from "@utils/constants";
/*
 * Vencord - MentionSoundCustomizer
 * Limita la frequenza degli avvisi di notifica/ping per evitare spam acustico.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts, UserStore } from "@webpack/common";

const settings = definePluginSettings({
    cooldownSeconds: {
        description: "Intervallo minimo (secondi) tra due notifiche sonore consecutive per evitare spam",
        type: OptionType.NUMBER,
        default: 3
    },
    blockSpamPings: {
        description: "Blocca l'effetto sonoro se lo stesso utente ti menziona più volte di seguito in pochi secondi",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let lastMentionSoundTime = 0;
let lastPingAuthorId = "";

export default definePlugin({
    name: "MentionSoundCustomizer",
    description: "Gestisce e mitiga la frequenza degli avvisi acustici delle menzioni, prevenendo il fastidioso spam di ping a raffica.",
    tags: ["Notifications", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    flux: {
        MESSAGE_CREATE({ message }: { message: any; }) {
            const currentUserId = UserStore.getCurrentUser()?.id;
            if (!currentUserId || !message?.mentions) return;

            const isMentioned = message.mentions.some((u: any) => u.id === currentUserId);
            if (!isMentioned) return;

            const now = Date.now();
            const cooldownMs = settings.store.cooldownSeconds * 1000;

            if (now - lastMentionSoundTime < cooldownMs) {
                // Notifica soppressa per cooldown
                return;
            }

            if (settings.store.blockSpamPings && message.author?.id === lastPingAuthorId && (now - lastMentionSoundTime < cooldownMs * 2)) {
                // Ping a raffica dallo stesso utente
                return;
            }

            lastMentionSoundTime = now;
            lastPingAuthorId = message.author?.id || "";
        }
    }
});
