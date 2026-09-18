import { Devs } from "@utils/constants";
/*
 * Vencord - CustomStatusPresets
 * Cambia rapidamente il tuo stato personalizzato Discord con preset preconfigurati e utili.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { RestAPI, showToast, Toasts } from "@webpack/common";

interface StatusPreset {
    text: string;
    emojiName?: string;
    emojiId?: string;
}

const presets: Record<string, StatusPreset> = {
    work: { text: "💻 Al lavoro / Coding", emojiName: "💻" },
    gaming: { text: "🎮 In sessione di gioco", emojiName: "🎮" },
    break: { text: "☕ In pausa caffè (AFK)", emojiName: "☕" },
    music: { text: "🎧 Ascolto musica & relax", emojiName: "🎧" },
    dnd: { text: "🌙 Non disturbare (Concentrazione)", emojiName: "🌙" }
};

async function setStatus(preset: StatusPreset) {
    try {
        await RestAPI.patch({
            url: "/users/@me/settings",
            body: {
                custom_status: {
                    text: preset.text,
                    emoji_name: preset.emojiName
                }
            }
        });
        showToast(`Stato impostato: ${preset.text}`, Toasts.Type.SUCCESS);
    } catch (err: any) {
        showToast(`Errore impostazione stato: ${err?.message || "Fallito"}`, Toasts.Type.FAILURE);
    }
}

async function clearStatus() {
    try {
        await RestAPI.patch({
            url: "/users/@me/settings",
            body: { custom_status: null }
        });
        showToast("Stato personalizzato rimosso.", Toasts.Type.MESSAGE);
    } catch {
        showToast("Impossibile rimuovere lo stato.", Toasts.Type.FAILURE);
    }
}

export default definePlugin({
    name: "CustomStatusPresets",
    description: "Permette di impostare con un solo clic stati personalizzati frequenti (Lavoro, Gioco, Pausa caffè, Musica, DND).",
    tags: ["Utility", "Activity"],
    authors: [Devs.Antigravity],

    toolboxActions: {
        "💻 Stato: Al Lavoro / Coding": () => setStatus(presets.work),
        "🎮 Stato: Gaming": () => setStatus(presets.gaming),
        "☕ Stato: In Pausa Caffè (AFK)": () => setStatus(presets.break),
        "🎧 Stato: Ascolto Musica": () => setStatus(presets.music),
        "🌙 Stato: Non Disturbare": () => setStatus(presets.dnd),
        "❌ Rimuovi Stato Personalizzato": () => clearStatus()
    }
});
