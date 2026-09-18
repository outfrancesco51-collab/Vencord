import { Devs } from "@utils/constants";
/*
 * Vencord - ChatWordCounter
 * Mostra conteggio parole e tempo stimato di lettura nella chat bar.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Text } from "@webpack/common";

const settings = definePluginSettings({
    showReadingTime: {
        description: "Mostra stima del tempo di lettura del messaggio",
        type: OptionType.BOOLEAN,
        default: true
    },
    minWordsToDisplay: {
        description: "Numero minimo di parole per mostrare il contatore",
        type: OptionType.NUMBER,
        default: 3
    }
});

let badgeElement: HTMLDivElement | null = null;

function updateWordCounter() {
    const textarea = document.querySelector('[class*="channelTextArea_"] [role="textbox"]') as HTMLElement;
    if (!textarea) {
        if (badgeElement) badgeElement.remove();
        badgeElement = null;
        return;
    }

    const text = textarea.textContent || "";
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = text.trim().length === 0 ? 0 : words.length;
    const charCount = text.length;

    if (wordCount < settings.store.minWordsToDisplay) {
        if (badgeElement) badgeElement.style.display = "none";
        return;
    }

    if (!badgeElement) {
        badgeElement = document.createElement("div");
        badgeElement.id = "vc-chat-word-counter";
        badgeElement.style.cssText = `
            position: absolute;
            bottom: -22px;
            right: 8px;
            font-size: 11px;
            color: var(--text-muted);
            pointer-events: none;
            z-index: 10;
            background: var(--background-secondary);
            padding: 2px 6px;
            border-radius: 4px;
        `;
        const container = textarea.closest('[class*="channelTextArea_"]');
        if (container) {
            container.appendChild(badgeElement);
        }
    }

    const readingSeconds = Math.ceil(wordCount / 3.5); // ~200 WPM
    const readingTimeStr = settings.store.showReadingTime
        ? ` • ⏱️ ${readingSeconds}s lettura`
        : "";

    badgeElement.style.display = "block";
    badgeElement.textContent = `📝 ${wordCount} parole (${charCount} caratteri)${readingTimeStr}`;
}

export default definePlugin({
    name: "ChatWordCounter",
    description: "Mostra in tempo reale il conteggio delle parole, dei caratteri e il tempo stimato di lettura sotto la casella di testo della chat.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    start() {
        document.addEventListener("input", updateWordCounter, true);
        document.addEventListener("keyup", updateWordCounter, true);
    },

    stop() {
        document.removeEventListener("input", updateWordCounter, true);
        document.removeEventListener("keyup", updateWordCounter, true);
        if (badgeElement) {
            badgeElement.remove();
            badgeElement = null;
        }
    }
});
