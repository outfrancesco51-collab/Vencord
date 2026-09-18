import { Devs } from "@utils/constants";
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    copyOnAltClick: {
        description: "Richiedi la pressione del tasto Alt per copiare l'ID (evita copie accidentali)",
        type: OptionType.BOOLEAN,
        default: false
    },
    showToastNotification: {
        description: "Mostra notifica toast quando un ID viene copiato",
        type: OptionType.BOOLEAN,
        default: true
    }
});

function handleDocumentClick(event: MouseEvent) {
    if (settings.store.copyOnAltClick && !event.altKey) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    // Cerca avatar, username, message ID, o channel node
    const matchNode = target.closest('[data-user-id], [class*="avatar"], [class*="username"], [data-list-item-id*="chat-messages"]');
    if (!matchNode) return;

    let id = matchNode.getAttribute("data-user-id");
    if (!id) {
        const idMatch = matchNode.outerHTML.match(/(\d{17,20})/);
        if (idMatch) id = idMatch[1];
    }

    if (id && /^\d{17,20}$/.test(id)) {
        navigator.clipboard.writeText(id).then(() => {
            if (settings.store.showToastNotification) {
                showToast(`📋 Copiato ID: ${id}`, Toasts.Type.SUCCESS);
            }
        }).catch(() => {});
    }
}

export default definePlugin({
    name: "CopyAlwaysId",
    description: "Copia automaticamente l'ID dell'utente o canale negli appunti appena si clicca sul suo avatar o nome con notifica toast istantanea.",
    authors: [Devs.Antigravity],
    tags: ["Utility", "Chat"],
    settings,

    start() {
        document.addEventListener("click", handleDocumentClick, true);
    },

    stop() {
        document.removeEventListener("click", handleDocumentClick, true);
    }
});
