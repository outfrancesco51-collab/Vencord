import { Devs } from "@utils/constants";
/*
 * Vencord - AntiGhostPing
 * Rileva ed intercetta i ghost ping (messaggi cancellati che ti hanno menzionato) con log locale.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Modal, openModal, showToast, Text, Toasts, UserStore, useState } from "@webpack/common";

interface GhostPing {
    id: string;
    authorName: string;
    authorId: string;
    channelName: string;
    content: string;
    timestamp: number;
}

const ghostPings: GhostPing[] = [];
// Mappa temporanea degli ultimi messaggi ricevuti che ci menzionano
const recentMentions = new Map<string, { author: any; content: string; channelId: string; timestamp: number; }>();

const settings = definePluginSettings({
    showNotification: {
        description: "Mostra notifica toast quando qualcuno cancella un messaggio che ti menziona",
        type: OptionType.BOOLEAN,
        default: true
    },
    maxLogSize: {
        description: "Massimo numero di ghost ping da memorizzare",
        type: OptionType.NUMBER,
        default: 30
    }
});

function GhostPingModal({ onClose }: { onClose: () => void; }) {
    const [, setDummy] = useState(0);

    return (
        <Modal
            title="👻 AntiGhostPing — Cronologia Menzioni Cancellate"
            onClose={onClose}
            transitionState={1}
        >
            <div style={{ padding: "16px", minWidth: "440px", maxHeight: "400px", overflowY: "auto" }}>
                {ghostPings.length === 0 ? (
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                        Nessun ghost ping rilevato finora. I messaggi cancellati che ti menzionano appariranno qui.
                    </Text>
                ) : (
                    ghostPings.map(ping => (
                        <div key={ping.id} style={{
                            padding: "10px",
                            background: "var(--background-secondary)",
                            borderRadius: "6px",
                            marginBottom: "8px",
                            borderLeft: "3px solid #ED4245"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <Text variant="text-sm/bold" style={{ color: "var(--header-primary)" }}>
                                    @{ping.authorName} ({ping.authorId})
                                </Text>
                                <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                                    #{ping.channelName} • {new Date(ping.timestamp).toLocaleTimeString()}
                                </Text>
                            </div>
                            <Text variant="text-sm/normal" style={{ wordBreak: "break-word" }}>
                                {ping.content || "(Messaggio senza testo o solo menzione)"}
                            </Text>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
}

export default definePlugin({
    name: "AntiGhostPing",
    description: "Salva e notifica quando un utente ti menziona e poi cancella il messaggio (Ghost Ping), conservando il testo cancellato.",
    tags: ["Notifications", "Chat", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    flux: {
        MESSAGE_CREATE({ message }: { message: any; }) {
            const currentUserId = UserStore.getCurrentUser()?.id;
            if (!currentUserId || !message?.mentions) return;

            const isMentioned = message.mentions.some((u: any) => u.id === currentUserId) || message.mention_everyone;
            if (isMentioned && message.author?.id !== currentUserId) {
                recentMentions.set(message.id, {
                    author: message.author,
                    content: message.content,
                    channelId: message.channel_id,
                    timestamp: Date.now()
                });

                // Pulisci i messaggi vecchi dopo 10 minuti
                if (recentMentions.size > 200) {
                    const oldest = recentMentions.keys().next().value;
                    if (oldest) recentMentions.delete(oldest);
                }
            }
        },

        MESSAGE_DELETE({ id, channelId }: { id: string; channelId: string; }) {
            const cached = recentMentions.get(id);
            if (cached) {
                recentMentions.delete(id);
                const channel = ChannelStore.getChannel(channelId);
                const entry: GhostPing = {
                    id,
                    authorName: cached.author?.username || "Sconosciuto",
                    authorId: cached.author?.id || "N/D",
                    channelName: channel?.name || channelId,
                    content: cached.content,
                    timestamp: Date.now()
                };

                ghostPings.unshift(entry);
                if (ghostPings.length > settings.store.maxLogSize) {
                    ghostPings.length = settings.store.maxLogSize;
                }

                if (settings.store.showNotification) {
                    showToast(
                        `👻 Ghost Ping da @${entry.authorName} in #${entry.channelName}: "${entry.content.slice(0, 40)}"`,
                        Toasts.Type.FAILURE
                    );
                }
            }
        }
    },

    toolboxActions: {
        "👻 Mostra Ghost Pings": () => {
            openModal(props => <GhostPingModal onClose={props.onClose} />);
        }
    }
});
