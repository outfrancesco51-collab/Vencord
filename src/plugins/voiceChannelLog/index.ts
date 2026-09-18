import { Devs } from "@utils/constants";
/*
 * Vencord - VoiceChannelLog
 * Registra le sessioni vocali, salva l'ID del canale vocale in caso di disconnessione e permette la riconnessione rapida.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelRouter, ChannelStore, GuildStore, showToast, Toasts, UserStore } from "@webpack/common";

interface VoiceLogEntry {
    timestamp: number;
    action: "join" | "leave" | "move";
    channelId: string;
    channelName: string;
    guildId?: string;
    guildName?: string;
}

const voiceHistory: VoiceLogEntry[] = [];

const settings = definePluginSettings({
    lastVoiceChannelId: {
        description: "Ultimo ID canale vocale registrato (salvato automaticamente)",
        type: OptionType.STRING,
        default: ""
    },
    lastGuildId: {
        description: "Ultimo ID server registrato (salvato automaticamente)",
        type: OptionType.STRING,
        default: ""
    },
    notifyOnDisconnect: {
        description: "Mostra notifica con ID canale salvato alla disconnessione vocale",
        type: OptionType.BOOLEAN,
        default: true
    },
    maxHistorySize: {
        description: "Numero massimo di log vocali da conservare in memoria",
        type: OptionType.NUMBER,
        default: 50
    }
});

let currentVoiceChannelId: string | null = null;
let currentGuildId: string | null = null;

export default definePlugin({
    name: "VoiceChannelLog",
    description: "Registra accessi, uscite e cambi di canale vocale. Salva automaticamente l'ID del canale in caso di disconnessione e permette di riconnettersi al volo.",
    tags: ["Voice", "Utility", "Notifications"],
    authors: [Devs.Antigravity],
    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: any[]; }) {
            const myId = UserStore.getCurrentUser()?.id;
            if (!myId || !voiceStates) return;

            for (const state of voiceStates) {
                if (state.userId !== myId) continue;

                const newChannelId = state.channelId || null;
                const newGuildId = state.guildId || null;

                // Disconnessione
                if (!newChannelId && currentVoiceChannelId) {
                    const ch = ChannelStore.getChannel(currentVoiceChannelId);
                    const chName = ch?.name || currentVoiceChannelId;
                    const guild = currentGuildId ? GuildStore.getGuild(currentGuildId) : null;

                    voiceHistory.unshift({
                        timestamp: Date.now(),
                        action: "leave",
                        channelId: currentVoiceChannelId,
                        channelName: chName,
                        guildId: currentGuildId || undefined,
                        guildName: guild?.name
                    });

                    // Salva l'ID canale e server nelle impostazioni
                    settings.store.lastVoiceChannelId = currentVoiceChannelId;
                    if (currentGuildId) settings.store.lastGuildId = currentGuildId;

                    if (settings.store.notifyOnDisconnect) {
                        showToast(
                            `🔌 Disconnesso da ${chName}! ID Canale Salvato: ${currentVoiceChannelId}`,
                            Toasts.Type.MESSAGE
                        );
                    }

                    currentVoiceChannelId = null;
                    currentGuildId = null;
                }
                // Connessione iniziale
                else if (newChannelId && !currentVoiceChannelId) {
                    const ch = ChannelStore.getChannel(newChannelId);
                    const chName = ch?.name || newChannelId;
                    const guild = newGuildId ? GuildStore.getGuild(newGuildId) : null;

                    voiceHistory.unshift({
                        timestamp: Date.now(),
                        action: "join",
                        channelId: newChannelId,
                        channelName: chName,
                        guildId: newGuildId || undefined,
                        guildName: guild?.name
                    });

                    currentVoiceChannelId = newChannelId;
                    currentGuildId = newGuildId;
                    settings.store.lastVoiceChannelId = newChannelId;
                    if (newGuildId) settings.store.lastGuildId = newGuildId;
                }
                // Spostamento canale
                else if (newChannelId && currentVoiceChannelId && newChannelId !== currentVoiceChannelId) {
                    const ch = ChannelStore.getChannel(newChannelId);
                    const chName = ch?.name || newChannelId;
                    const guild = newGuildId ? GuildStore.getGuild(newGuildId) : null;

                    voiceHistory.unshift({
                        timestamp: Date.now(),
                        action: "move",
                        channelId: newChannelId,
                        channelName: chName,
                        guildId: newGuildId || undefined,
                        guildName: guild?.name
                    });

                    currentVoiceChannelId = newChannelId;
                    currentGuildId = newGuildId;
                    settings.store.lastVoiceChannelId = newChannelId;
                    if (newGuildId) settings.store.lastGuildId = newGuildId;
                }

                if (voiceHistory.length > settings.store.maxHistorySize) {
                    voiceHistory.length = settings.store.maxHistorySize;
                }
            }
        }
    },

    toolboxActions: {
        "🔊 Riconnetti all'ultimo Canale Vocale": () => {
            const lastId = settings.store.lastVoiceChannelId;
            const lastGuild = settings.store.lastGuildId;
            if (!lastId) {
                showToast("Nessun canale vocale salvato in memoria.", Toasts.Type.FAILURE);
                return;
            }

            try {
                if (ChannelRouter?.transitionToChannel) {
                    ChannelRouter.transitionToChannel(lastId);
                } else if ((ChannelRouter as any)?.selectVoiceChannel) {
                    (ChannelRouter as any).selectVoiceChannel(lastId);
                }
                showToast(`🔊 Riconnessione al canale ${lastId}...`, Toasts.Type.SUCCESS);
            } catch {
                navigator.clipboard.writeText(lastId);
                showToast(`ID Canale copiato negli appunti: ${lastId}`, Toasts.Type.SUCCESS);
            }
        },
        "📋 Copia ID Ultimo Canale Vocale": () => {
            const lastId = settings.store.lastVoiceChannelId;
            if (!lastId) {
                showToast("Nessun canale vocale recente.", Toasts.Type.FAILURE);
                return;
            }
            navigator.clipboard.writeText(lastId);
            showToast(`ID Canale ${lastId} copiato negli appunti!`, Toasts.Type.SUCCESS);
        }
    }
});
