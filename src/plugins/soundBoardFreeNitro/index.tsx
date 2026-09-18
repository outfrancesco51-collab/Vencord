/*
 * Vencord - SoundBoardFreeNitro
 * Use soundboard sounds from other servers without Nitro
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, Menu, Modal, openModal, RestAPI, Text, useState } from "@webpack/common";

const settings = definePluginSettings({
    playFromOtherGuilds: {
        description: "Permette di riprodurre suoni da qualsiasi server senza Nitro",
        type: OptionType.BOOLEAN,
        default: true
    },
    showGuildName: {
        description: "Mostra il nome del server accanto al suono cross-server",
        type: OptionType.BOOLEAN,
        default: true
    }
});

interface SoundboardSound {
    sound_id: string;
    name: string;
    guild_id: string;
    emoji?: { name: string; id?: string; };
}

async function playSoundboardSound(sound: SoundboardSound, channelId: string) {
    try {
        // Discord REST endpoint per suonare suoni soundboard
        await RestAPI.post({
            url: `/channels/${channelId}/send-soundboard-sound`,
            body: {
                sound_id: sound.sound_id,
                source_guild_id: sound.guild_id
            }
        });
    } catch (err: any) {
        console.error("[SoundBoardFreeNitro] Errore:", err);
    }
}

async function fetchGuildSounds(guildId: string): Promise<SoundboardSound[]> {
    try {
        const res = await RestAPI.get({ url: `/guilds/${guildId}/soundboard-sounds` });
        return res.body?.items || [];
    } catch {
        return [];
    }
}

// Modal to pick a sound from any guild
function SoundPickerModal({ currentChannelId, onClose }: { currentChannelId: string; onClose: () => void; }) {
    const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
    const [sounds, setSounds] = useState<SoundboardSound[]>([]);
    const [loading, setLoading] = useState(false);

    const guilds = Object.values(GuildStore.getGuilds());

    async function loadSounds(guildId: string) {
        setLoading(true);
        setSelectedGuildId(guildId);
        const data = await fetchGuildSounds(guildId);
        setSounds(data);
        setLoading(false);
    }

    return (
        <Modal
            title="🔊 SoundBoard Free — Scegli Server"
            onClose={onClose}
            transitionState={1}
        >
            <div style={{ display: "flex", gap: "12px", padding: "16px", minHeight: "400px" }}>
                {/* Guild list */}
                <div style={{ width: "180px", overflowY: "auto", borderRight: "1px solid var(--background-modifier-accent)", paddingRight: "8px" }}>
                    {guilds.map(guild => (
                        <div
                            key={guild.id}
                            onClick={() => loadSounds(guild.id)}
                            style={{
                                padding: "8px",
                                cursor: "pointer",
                                borderRadius: "6px",
                                background: selectedGuildId === guild.id ? "var(--brand-experiment)" : "transparent",
                                marginBottom: "4px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}
                        >
                            {guild.icon && (
                                <img
                                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=32`}
                                    style={{ width: 24, height: 24, borderRadius: "50%" }}
                                />
                            )}
                            <Text variant="text-sm/medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {guild.name}
                            </Text>
                        </div>
                    ))}
                </div>

                {/* Sounds list */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {loading && <Text variant="text-md/normal" style={{ color: "var(--text-muted)" }}>Caricamento...</Text>}
                    {!loading && sounds.length === 0 && selectedGuildId && (
                        <Text variant="text-md/normal" style={{ color: "var(--text-muted)" }}>Nessun suono trovato in questo server.</Text>
                    )}
                    {!loading && !selectedGuildId && (
                        <Text variant="text-md/normal" style={{ color: "var(--text-muted)" }}>← Seleziona un server per vedere i suoni.</Text>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {sounds.map(sound => (
                            <div
                                key={sound.sound_id}
                                onClick={() => {
                                    playSoundboardSound(sound, currentChannelId);
                                    onClose();
                                }}
                                style={{
                                    padding: "10px 16px",
                                    background: "var(--background-secondary)",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    border: "1px solid var(--background-modifier-accent)",
                                    textAlign: "center",
                                    minWidth: "80px"
                                }}
                            >
                                <Text variant="text-lg/normal">
                                    {sound.emoji?.name || "🔊"}
                                </Text>
                                <Text variant="text-xs/medium" style={{ marginTop: "4px" }}>
                                    {sound.name}
                                </Text>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default definePlugin({
    name: "SoundBoardFreeNitro",
    description: "Riproduce suoni da qualsiasi server senza Nitro. Bypass del limite cross-server per soundboard.",
    tags: ["Voice", "Media", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    patches: [
        {
            // Bypass la restrizione che blocca l'invio di suoni cross-server senza Nitro
            find: "canUseSoundboardEmojiFromOtherGuilds",
            replacement: {
                match: /canUseSoundboardEmojiFromOtherGuilds\(\i\)\{/,
                replace: "canUseSoundboardEmojiFromOtherGuilds(){if($self.settings.store.playFromOtherGuilds) return true;"
            }
        }
    ],

    contextMenus: {
        "channel-context": (children, props) => {
            if (!props?.channel) return;
            const channelId = props.channel.id;

            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id="sbfn-open-picker"
                    label="🔊 SoundBoard Free — Scegli Suono"
                    action={() => {
                        openModal(modalProps => (
                            <SoundPickerModal
                                currentChannelId={channelId}
                                onClose={modalProps.onClose}
                            />
                        ));
                    }}
                />
            );
        }
    }
});
