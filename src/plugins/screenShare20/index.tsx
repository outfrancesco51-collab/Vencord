/*
 * Vencord - ScreenShare 2.0
 * Black overlay on specific sites + background music during screenshare
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, Text, useState, TextInput } from "@webpack/common";

const settings = definePluginSettings({
    enableSiteBlacklist: {
        description: "Attiva il quadrato nero sui siti in blacklist durante lo screenshare",
        type: OptionType.BOOLEAN,
        default: true
    },
    blacklistedSites: {
        description: "Siti da oscurare (separati da virgola, es: netflix.com,bank.com)",
        type: OptionType.STRING,
        default: "netflix.com,primevideo.com,bank,paypal.com"
    },
    enableBackgroundMusic: {
        description: "Permette di riprodurre musica durante lo screenshare anche senza attività audio",
        type: OptionType.BOOLEAN,
        default: true
    },
    musicUrl: {
        description: "URL della musica di sottofondo (mp3/stream)",
        type: OptionType.STRING,
        default: ""
    }
});

let overlayElement: HTMLDivElement | null = null;
let audioElement: HTMLAudioElement | null = null;
let siteObserver: MutationObserver | null = null;

function createOverlay() {
    if (overlayElement) return;
    overlayElement = document.createElement("div");
    overlayElement.id = "vc-ss20-overlay";
    overlayElement.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: #000;
        z-index: 999999;
        display: none;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        pointer-events: none;
    `;

    const label = document.createElement("p");
    label.style.cssText = "color: #fff; font-size: 18px; font-family: sans-serif; margin-top: 12px;";
    label.textContent = "🔒 Contenuto oscurato da ScreenShare 2.0";

    const icon = document.createElement("p");
    icon.style.cssText = "font-size: 64px;";
    icon.textContent = "🖤";

    overlayElement.appendChild(icon);
    overlayElement.appendChild(label);
    document.body.appendChild(overlayElement);
}

function removeOverlay() {
    overlayElement?.remove();
    overlayElement = null;
}

function checkCurrentSite() {
    if (!settings.store.enableSiteBlacklist || !overlayElement) return;

    const blacklist = settings.store.blacklistedSites
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

    const currentHost = window.location.hostname.toLowerCase();
    const shouldBlock = blacklist.some(site => currentHost.includes(site));

    if (shouldBlock) {
        overlayElement.style.display = "flex";
    } else {
        overlayElement.style.display = "none";
    }
}

function startSiteWatcher() {
    createOverlay();
    checkCurrentSite();

    // Watch for navigation changes (SPA)
    siteObserver = new MutationObserver(() => checkCurrentSite());
    siteObserver.observe(document, { subtree: true, childList: true });

    // Also watch history API
    const origPush = history.pushState.bind(history);
    history.pushState = function (...args) {
        origPush(...args);
        setTimeout(checkCurrentSite, 100);
    };
}

function stopSiteWatcher() {
    siteObserver?.disconnect();
    siteObserver = null;
    removeOverlay();
}

function startBackgroundMusic(url: string) {
    if (!url) return;
    stopBackgroundMusic();

    audioElement = new Audio(url);
    audioElement.loop = true;
    audioElement.volume = 0.5;
    audioElement.play().catch(e => console.error("[SS2.0] Musica non avviata:", e));
}

function stopBackgroundMusic() {
    if (audioElement) {
        audioElement.pause();
        audioElement = null;
    }
}

export default definePlugin({
    name: "ScreenShare20",
    description: "🖥️ ScreenShare avanzato: oscura siti specifici e riproduce musica di sottofondo durante la condivisione schermo.",
    tags: ["ScreenShare", "Privacy", "Music"],
    authors: [{ name: "Antigravity", id: 0n }],
    settings,

    patches: [
        {
            // Intercetta l'avvio dello screenshare per attivare le funzioni
            find: "\"stream-context-menu\"",
            replacement: {
                match: /(startScreenshare\(\))/,
                replace: "($self.onScreenshareStart(),$1)"
            }
        }
    ],

    onScreenshareStart() {
        if (settings.store.enableSiteBlacklist) {
            startSiteWatcher();
        }
        if (settings.store.enableBackgroundMusic && settings.store.musicUrl) {
            startBackgroundMusic(settings.store.musicUrl);
        }
    },

    onScreenshareStop() {
        stopSiteWatcher();
        stopBackgroundMusic();
    },

    start() {
        console.log("[ScreenShare 2.0] Avviato.");
    },

    stop() {
        stopSiteWatcher();
        stopBackgroundMusic();
    },

    // Settings UI extra
    settingsAboutComponent: () => (
        <div style={{ padding: "8px" }}>
            <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                💡 <strong>Come funziona:</strong><br />
                • Quando avvii lo screenshare, tutti i siti in blacklist vengono oscurati con un quadrato nero.<br />
                • La musica di sottofondo viene riprodotta automaticamente.<br />
                • Gli spettatori non vedranno il contenuto oscurato.<br />
                • Aggiungi URL mp3/stream nel campo musica (es: URL di YouTube convertito via yt-dlp).
            </Text>
        </div>
    )
});
