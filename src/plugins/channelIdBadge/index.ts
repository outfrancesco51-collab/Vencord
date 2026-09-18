import { Devs } from "@utils/constants";
/*
 * Vencord - ChannelIdBadge
 * Mostra un badge con l'ID del canale nell'header superiore con copia rapida negli appunti con un clic.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore, showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    showInHeader: {
        description: "Mostra il badge con l'ID del canale nell'intestazione in alto",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let badgeNode: HTMLDivElement | null = null;

function renderChannelIdBadge() {
    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId || !settings.store.showInHeader) {
        if (badgeNode) badgeNode.remove();
        badgeNode = null;
        return;
    }

    const titleContainer = document.querySelector('[class*="title_"] [class*="children_"]') as HTMLElement;
    if (!titleContainer) return;

    if (!badgeNode) {
        badgeNode = document.createElement("div");
        badgeNode.id = "vc-channel-id-badge";
        badgeNode.style.cssText = `
            display: inline-flex;
            align-items: center;
            padding: 2px 6px;
            font-size: 11px;
            font-family: monospace;
            background: var(--background-secondary);
            border-radius: 4px;
            margin-left: 8px;
            cursor: pointer;
            color: var(--text-muted);
            border: 1px solid var(--background-modifier-accent);
        `;
        badgeNode.title = "Clicca per copiare l'ID del canale";
        badgeNode.onclick = () => {
            const currentId = SelectedChannelStore.getChannelId();
            if (currentId) {
                navigator.clipboard.writeText(currentId);
                showToast(`ID Canale ${currentId} copiato!`, Toasts.Type.SUCCESS);
            }
        };
    }

    badgeNode.textContent = `ID: ${channelId}`;
    if (!titleContainer.contains(badgeNode)) {
        titleContainer.appendChild(badgeNode);
    }
}

export default definePlugin({
    name: "ChannelIdBadge",
    description: "Mostra l'ID numerico del canale direttamente nell'intestazione superiore con pulsante per copiarlo al volo negli appunti.",
    tags: ["Utility", "Customisation"],
    authors: [Devs.Antigravity],
    settings,

    start() {
        renderChannelIdBadge();
    },

    stop() {
        if (badgeNode) {
            badgeNode.remove();
            badgeNode = null;
        }
    },

    flux: {
        CHANNEL_SELECT() {
            setTimeout(renderChannelIdBadge, 100);
        }
    },

    toolboxActions: {
        "📋 Copia ID Canale Corrente": () => {
            const currentId = SelectedChannelStore.getChannelId();
            if (currentId) {
                navigator.clipboard.writeText(currentId);
                showToast(`ID Canale ${currentId} copiato!`, Toasts.Type.SUCCESS);
            }
        }
    }
});
