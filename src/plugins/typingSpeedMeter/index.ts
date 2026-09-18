import { Devs } from "@utils/constants";
/*
 * Vencord - TypingSpeedMeter
 * Tachimetro di digitazione in tempo reale: misura la tua velocità WPM mentre scrivi in chat.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    showWpmBadge: {
        description: "Mostra il badge con la velocità WPM (Parole al minuto) sotto la chatbox",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let startTime: number | null = null;
let characterCount = 0;
let wpmBadge: HTMLDivElement | null = null;

function onKey(e: KeyboardEvent) {
    if (!settings.store.showWpmBadge) return;

    const target = e.target as HTMLElement;
    if (!target || !target.getAttribute("role")?.includes("textbox")) return;

    if (!startTime) {
        startTime = Date.now();
        characterCount = 0;
    }

    if (e.key === "Enter" && !e.shiftKey) {
        // Messaggio inviato, reset
        startTime = null;
        characterCount = 0;
        if (wpmBadge) wpmBadge.style.display = "none";
        return;
    }

    if (e.key.length === 1) {
        characterCount++;
    }

    const elapsedMinutes = (Date.now() - startTime) / 60000;
    if (elapsedMinutes > 0.02 && characterCount > 5) {
        const words = characterCount / 5;
        const wpm = Math.round(words / elapsedMinutes);

        if (!wpmBadge) {
            wpmBadge = document.createElement("div");
            wpmBadge.id = "vc-typing-wpm-badge";
            wpmBadge.style.cssText = `
                position: absolute;
                bottom: -22px;
                left: 8px;
                font-size: 11px;
                font-weight: bold;
                color: #5865F2;
                background: var(--background-secondary);
                padding: 2px 6px;
                border-radius: 4px;
                z-index: 10;
                pointer-events: none;
            `;
            const container = target.closest('[class*="channelTextArea_"]');
            if (container) container.appendChild(wpmBadge);
        }

        wpmBadge.style.display = "block";
        wpmBadge.textContent = `⚡ Velocità: ${wpm} WPM`;
    }
}

export default definePlugin({
    name: "TypingSpeedMeter",
    description: "Misura e mostra la velocità di digitazione in tempo reale (WPM) nella barra di scrittura della chat.",
    tags: ["Fun", "Chat", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    start() {
        document.addEventListener("keydown", onKey, true);
    },

    stop() {
        document.removeEventListener("keydown", onKey, true);
        if (wpmBadge) {
            wpmBadge.remove();
            wpmBadge = null;
        }
    }
});
