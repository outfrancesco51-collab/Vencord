import { Devs } from "@utils/constants";
/*
 * Vencord - MessageDraftSaver
 * Preserva i testi digitati per canale in memoria locale per non perdere mai bozze lunghe o messaggi importanti.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore, showToast, Toasts } from "@webpack/common";

const draftsMap = new Map<string, string>();

const settings = definePluginSettings({
    autoRestoreDraft: {
        description: "Notifica se è presente una bozza non inviata quando torni su un canale",
        type: OptionType.BOOLEAN,
        default: true
    }
});

function onChatInput(e: Event) {
    const target = e.target as HTMLElement;
    if (!target || !target.getAttribute("role")?.includes("textbox")) return;

    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) return;

    const text = target.textContent || "";
    if (text.trim().length > 0) {
        draftsMap.set(channelId, text);
    } else {
        draftsMap.delete(channelId);
    }
}

export default definePlugin({
    name: "MessageDraftSaver",
    description: "Salva automaticamente in memoria locale i testi digitati nella chat bar per canale, evitando la perdita accidentale di bozze lunghe.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    start() {
        document.addEventListener("input", onChatInput, true);
    },

    stop() {
        document.removeEventListener("input", onChatInput, true);
        draftsMap.clear();
    },

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId?: string; }) {
            if (!channelId || !settings.store.autoRestoreDraft) return;

            const saved = draftsMap.get(channelId);
            if (saved && saved.length > 5) {
                showToast(`📝 Bozza salvata trovata per questo canale (${saved.length} car.)`, Toasts.Type.MESSAGE);
            }
        },
        MESSAGE_CREATE({ message }: { message: any; }) {
            // Se abbiamo inviato con successo il messaggio, svuota la bozza
            if (message?.channel_id && draftsMap.has(message.channel_id)) {
                draftsMap.delete(message.channel_id);
            }
        }
    },

    toolboxActions: {
        "📝 Recupera Ultima Bozza": () => {
            const channelId = SelectedChannelStore.getChannelId();
            if (!channelId || !draftsMap.has(channelId)) {
                showToast("Nessuna bozza salvata per il canale corrente.", Toasts.Type.FAILURE);
                return;
            }
            const draft = draftsMap.get(channelId)!;
            navigator.clipboard.writeText(draft);
            showToast("Bozza copiata negli appunti!", Toasts.Type.SUCCESS);
        }
    }
});
