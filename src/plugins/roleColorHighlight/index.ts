import { Devs } from "@utils/constants";
/*
 * Vencord - RoleColorHighlight
 * Evidenzia visivamente i nomi e bordi dei messaggi degli utenti in base al colore del loro ruolo server.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    highlightBorder: {
        description: "Aggiungi un bordo sinistro colorato ai messaggi in chat col colore del ruolo più alto dell'utente",
        type: OptionType.BOOLEAN,
        default: true
    },
    glowEffect: {
        description: "Aggiungi un leggero effetto bagliore (glow) al nome dell'utente in chat",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let styleElem: HTMLStyleElement | null = null;

function updateStyles() {
    if (!styleElem) {
        styleElem = document.createElement("style");
        styleElem.id = "vc-role-color-highlight";
        document.head.appendChild(styleElem);
    }

    styleElem.textContent = `
        ${settings.store.glowEffect ? `
            [class*="username_"][style*="color:"] {
                text-shadow: 0 0 8px currentColor;
                transition: text-shadow 0.2s ease;
            }
        ` : ""}
        ${settings.store.highlightBorder ? `
            [class*="message_"][class*="cozy_"]:hover {
                border-left: 3px solid var(--interactive-hover);
            }
        ` : ""}
    `;
}

export default definePlugin({
    name: "RoleColorHighlight",
    description: "Migliora la leggibilità e l'estetica dei ruoli in chat applicando un elegante bagliore colorato e indicatori laterali.",
    tags: ["Appearance", "Roles", "Chat"],
    authors: [Devs.Antigravity],
    settings,

    start() {
        updateStyles();
    },

    stop() {
        if (styleElem) {
            styleElem.remove();
            styleElem = null;
        }
    }
});
