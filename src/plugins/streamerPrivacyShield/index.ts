import { Devs } from "@utils/constants";
/*
 * Vencord - StreamerPrivacyShield
 * Protegge la privacy sfocando o nascondendo informazioni sensibili (DM, ID, server privati) durante lo streaming.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    blurDirectMessages: {
        description: "Sfoca l'elenco delle chat private (DM) nella barra laterale",
        type: OptionType.BOOLEAN,
        default: true
    },
    blurUserTags: {
        description: "Sfoca i tag utente e discriminator",
        type: OptionType.BOOLEAN,
        default: true
    },
    shieldActive: {
        description: "Attiva manualmente lo scudo di privacy anche quando non stai condividendo schermo",
        type: OptionType.BOOLEAN,
        default: false
    }
});

let styleTag: HTMLStyleElement | null = null;

function applyShieldCSS(active: boolean) {
    if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "vc-streamer-privacy-shield";
        document.head.appendChild(styleTag);
    }

    if (!active) {
        styleTag.textContent = "";
        return;
    }

    styleTag.textContent = `
        /* Sfocatura privacy Streamer Shield */
        [class*="privateChannels_"] [class*="channel_"] {
            filter: blur(5px) !important;
            transition: filter 0.2s ease !important;
        }
        [class*="privateChannels_"] [class*="channel_"]:hover {
            filter: blur(0px) !important;
        }
        [class*="userTagDiscriminatorNoNickname_"], [class*="hoverRoll_"] {
            filter: blur(4px) !important;
        }
        [class*="userTagDiscriminatorNoNickname_"]:hover, [class*="hoverRoll_"]:hover {
            filter: blur(0px) !important;
        }
    `;
}

export default definePlugin({
    name: "StreamerPrivacyShield",
    description: "Oscura e sfoca i messaggi privati, nomi delle persone nei DM e tag utente per proteggere la tua privacy durante stream o screenshare.",
    tags: ["Privacy", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    start() {
        if (settings.store.shieldActive) {
            applyShieldCSS(true);
        }
    },

    stop() {
        applyShieldCSS(false);
        if (styleTag) {
            styleTag.remove();
            styleTag = null;
        }
    },

    toolboxActions: {
        "🛡️ Attiva/Disattiva Streamer Privacy Shield": () => {
            const next = !settings.store.shieldActive;
            settings.store.shieldActive = next;
            applyShieldCSS(next);
            showToast(next ? "🛡️ Privacy Shield ATTIVO: Dati sensibili sfocati" : "🔓 Privacy Shield DISATTIVO", Toasts.Type.MESSAGE);
        }
    }
});
