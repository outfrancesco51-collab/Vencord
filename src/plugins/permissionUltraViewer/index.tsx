import { Devs } from "@utils/constants";
/*
 * Vencord - PermissionUltraViewer
 * Ultra version: channel lock status, role hierarchy, ticket bypass, inherited perms, raw bitfield view
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { SafetyIcon } from "@components/Icons";
import definePlugin, { OptionType } from "@utils/types";
import {
    Button,
    ChannelStore,
    Forms,
    GuildMemberStore,
    GuildRoleStore,
    GuildStore,
    Menu,
    Modal,
    openModal,
    PermissionsBits,
    PermissionStore,
    Text,
    UserStore,
    useState
} from "@webpack/common";

export const enum PermissionsSortOrder {
    HighestRole,
    LowestRole
}

const enum MenuItemParentType {
    User,
    Channel,
    Guild
}

// Friendly permission names
const PERMISSION_NAMES: Record<string, string> = {
    ADMINISTRATOR: "👑 Amministratore",
    MANAGE_GUILD: "Gestisci Server",
    MANAGE_ROLES: "Gestisci Ruoli",
    MANAGE_CHANNELS: "Gestisci Canali",
    KICK_MEMBERS: "Kicka Membri",
    BAN_MEMBERS: "Banna Membri",
    MODERATE_MEMBERS: "Timeout Membri",
    VIEW_AUDIT_LOG: "Vedi Audit Log",
    VIEW_CHANNEL: "👁️ Vedi Canale",
    SEND_MESSAGES: "Invia Messaggi",
    SEND_MESSAGES_IN_THREADS: "Invia nei Thread",
    CREATE_PUBLIC_THREADS: "Crea Thread Pubblici",
    CREATE_PRIVATE_THREADS: "Crea Thread Privati",
    EMBED_LINKS: "Incorpora Link",
    ATTACH_FILES: "Allega File",
    ADD_REACTIONS: "Aggiungi Reazioni",
    USE_EXTERNAL_EMOJIS: "Emoji Esterne",
    USE_EXTERNAL_STICKERS: "Sticker Esterni",
    MENTION_EVERYONE: "Menziona @everyone",
    MANAGE_MESSAGES: "Gestisci Messaggi",
    MANAGE_THREADS: "Gestisci Thread",
    READ_MESSAGE_HISTORY: "Cronologia Messaggi",
    SEND_TTS_MESSAGES: "Messaggi TTS",
    USE_APPLICATION_COMMANDS: "Comandi Slash",
    SEND_VOICE_MESSAGES: "Messaggi Vocali",
    CONNECT: "Connetti Vocale",
    SPEAK: "Parla in Vocale",
    STREAM: "Video / ScreenShare",
    USE_VAD: "Attività Vocale",
    PRIORITY_SPEAKER: "Voce Prioritaria",
    MUTE_MEMBERS: "Muta Membri",
    DEAFEN_MEMBERS: "Rendi Sordi Membri",
    MOVE_MEMBERS: "Sposta Membri",
    USE_SOUNDBOARD: "🔊 Usa Soundboard",
    USE_EXTERNAL_SOUNDS: "Suoni Soundboard Esterni",
    CREATE_INSTANT_INVITE: "Crea Inviti",
    CHANGE_NICKNAME: "Cambia Nickname",
    MANAGE_NICKNAMES: "Gestisci Nickname",
    MANAGE_WEBHOOKS: "Gestisci Webhook",
    MANAGE_GUILD_EXPRESSIONS: "Gestisci Emoji/Sticker",
    MANAGE_EVENTS: "Gestisci Eventi"
};

export const settings = definePluginSettings({
    showLockStatus: {
        description: "Mostra lo stato di blocco (🔒 Bloccato / ⚠️ Ristretto / 🔓 Aperto) dei canali",
        type: OptionType.BOOLEAN,
        default: true
    },
    showRoleHierarchy: {
        description: "Visualizza l'intera gerarchia dei ruoli del server con confronto di potere",
        type: OptionType.BOOLEAN,
        default: true
    },
    showRawBitfield: {
        description: "Mostra il valore esadecimale e raw bitfield dei permessi",
        type: OptionType.BOOLEAN,
        default: false
    },
    showInheritedPerms: {
        description: "Mostra da quale ruolo proviene ciascun permesso ereditato",
        type: OptionType.BOOLEAN,
        default: true
    }
});

// Calcola stato di blocco canale
function getChannelLockInfo(channelId?: string) {
    if (!channelId) return null;
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return null;

    const isVoice = Boolean(channel.isGuildVoice?.() || (channel as any).type === 2);
    const canView = PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel);
    const canSend = PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel);
    const canConnect = isVoice ? PermissionStore.can(PermissionsBits.CONNECT, channel) : true;

    if (!canView) {
        return {
            status: "LOCKED",
            label: "🔒 Canale Bloccato (Nessun permesso di visualizzazione)",
            color: "#ED4245",
            bg: "rgba(237, 66, 69, 0.15)"
        };
    }
    if (!canConnect) {
        return {
            status: "NO_CONNECT",
            label: "🚫 Vocale Bloccato (Nessun permesso di connessione)",
            color: "#ED4245",
            bg: "rgba(237, 66, 69, 0.15)"
        };
    }
    if (!canSend && !isVoice) {
        return {
            status: "RESTRICTED",
            label: "⚠️ Canale Ristretto (Solo Lettura, invio bloccato)",
            color: "#FAA81A",
            bg: "rgba(250, 168, 26, 0.15)"
        };
    }
    return {
        status: "OPEN",
        label: "🔓 Canale Aperto e Accessibile",
        color: "#57F287",
        bg: "rgba(87, 242, 135, 0.15)"
    };
}

function UltraPermissionsView({
    guildId,
    channelId,
    userId,
    onClose
}: {
    guildId: string;
    channelId?: string;
    userId?: string;
    onClose?: () => void;
}) {
    const [tab, setTab] = useState<"perms" | "hierarchy" | "channels">("perms");
    const guild = GuildStore.getGuild(guildId);
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;
    const currentUser = UserStore.getCurrentUser();
    const targetUserId = userId || currentUser?.id || "";
    const member = GuildMemberStore.getMember(guildId, targetUserId);
    const allRoles = GuildRoleStore.getSortedRoles(guildId);
    const lockInfo = getChannelLockInfo(channelId);

    // Ruoli ordinati dal più alto
    const sortedRolesDesc = [...allRoles].sort((a, b) => b.position - a.position);
    const currentMember = currentUser ? GuildMemberStore.getMember(guildId, currentUser.id) : null;
    const currentHighestRolePos = currentMember?.roles?.reduce((max, roleId) => {
        const r = allRoles.find(role => role.id === roleId);
        return r ? Math.max(max, r.position) : max;
    }, 0) || 0;

    // Calcolo permessi effettivi
    const effectivePerms = member?.roles
        ?.map(roleId => allRoles.find(r => r.id === roleId))
        .filter(Boolean)
        .reduce((acc, role) => acc | BigInt(role!.permissions), 0n) || 0n;

    return (
        <div style={{ padding: "16px", minWidth: "480px", maxWidth: "650px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <SafetyIcon height="22" width="22" />
                    <div>
                        <Text variant="heading-md/bold">🛡️ PermissionUltraViewer</Text>
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                            Server: {guild?.name || guildId} {member ? `• Utente: @${member.nick || targetUserId}` : ""}
                        </Text>
                    </div>
                </div>
            </div>

            {/* Nav Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: "8px" }}>
                <Button
                    size={Button.Sizes.SMALL}
                    color={tab === "perms" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                    onClick={() => setTab("perms")}
                >
                    📜 Permessi Dettagliati
                </Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={tab === "hierarchy" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                    onClick={() => setTab("hierarchy")}
                >
                    👑 Gerarchia Ruoli ({allRoles.length})
                </Button>
                {channel && (
                    <Button
                        size={Button.Sizes.SMALL}
                        color={tab === "channels" ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                        onClick={() => setTab("channels")}
                    >
                        🔒 Stato Canale
                    </Button>
                )}
            </div>

            {/* Channel Lock Status Banner */}
            {lockInfo && (
                <div style={{
                    marginBottom: "12px",
                    padding: "10px 14px",
                    borderRadius: "6px",
                    background: lockInfo.bg,
                    border: `1px solid ${lockInfo.color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    <div>
                        <Text variant="text-sm/semibold" style={{ color: lockInfo.color }}>
                            {lockInfo.label}
                        </Text>
                        {channel && (
                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", marginTop: "2px" }}>
                                Canale: #{channel.name} (Tipo: {channel.type})
                            </Text>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Permessi Dettagliati */}
            {tab === "perms" && (
                <div>
                    {settings.store.showRawBitfield && (
                        <div style={{ marginBottom: "10px", padding: "8px", background: "var(--background-secondary)", borderRadius: "6px" }}>
                            <Text variant="text-xs/normal" style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>
                                Raw Bitfield: {effectivePerms.toString()} (0x{effectivePerms.toString(16).toUpperCase()})
                            </Text>
                        </div>
                    )}
                    <div style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                        {Object.entries(PERMISSION_NAMES).map(([key, label]) => {
                            const bit = (PermissionsBits as any)[key];
                            if (!bit) return null;
                            const hasPerm = (effectivePerms & BigInt(bit)) !== 0n;
                            const sourceRole = member?.roles
                                ?.map(id => allRoles.find(r => r.id === id))
                                .find(r => r && (BigInt(r.permissions) & BigInt(bit)) !== 0n);

                            return (
                                <div key={key} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "5px 10px",
                                    borderRadius: "4px",
                                    marginBottom: "3px",
                                    background: hasPerm ? "rgba(87, 242, 135, 0.08)" : "rgba(237, 66, 69, 0.05)"
                                }}>
                                    <Text variant="text-sm/normal">{label}</Text>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {settings.store.showInheritedPerms && sourceRole && (
                                            <span style={{
                                                fontSize: "11px",
                                                padding: "2px 6px",
                                                borderRadius: "4px",
                                                background: "var(--background-secondary)",
                                                color: sourceRole.colorString || "var(--text-muted)"
                                            }}>
                                                @{sourceRole.name}
                                            </span>
                                        )}
                                        <span style={{
                                            fontSize: "14px",
                                            fontWeight: "bold",
                                            color: hasPerm ? "#57F287" : "#ED4245"
                                        }}>
                                            {hasPerm ? "✓" : "✗"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab: Gerarchia Ruoli */}
            {tab === "hierarchy" && (
                <div>
                    <div style={{ marginBottom: "8px", padding: "6px 10px", background: "var(--background-secondary)", borderRadius: "6px" }}>
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                            I ruoli sono elencati dall'alto verso il basso. I ruoli con posizione superiore controllano e gestiscono quelli inferiori.
                        </Text>
                    </div>
                    <div style={{ maxHeight: "380px", overflowY: "auto", paddingRight: "4px" }}>
                        {sortedRolesDesc.map((role, idx) => {
                            const isAboveYou = role.position >= currentHighestRolePos && role.id !== guild?.id;
                            const hasAdmin = (BigInt(role.permissions) & BigInt(PermissionsBits.ADMINISTRATOR)) !== 0n;

                            return (
                                <div key={role.id} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "6px 10px",
                                    borderRadius: "5px",
                                    marginBottom: "4px",
                                    background: "var(--background-secondary)",
                                    borderLeft: `4px solid ${role.colorString || "#80848E"}`
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{
                                            fontFamily: "monospace",
                                            fontSize: "12px",
                                            color: "var(--text-muted)",
                                            minWidth: "24px"
                                        }}>
                                            #{sortedRolesDesc.length - idx}
                                        </span>
                                        <div>
                                            <Text variant="text-sm/semibold" style={{ color: role.colorString || "var(--text-normal)" }}>
                                                @{role.name}
                                            </Text>
                                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                                                Pos: {role.position} {role.hoist ? "• Separato" : ""} {role.managed ? "• Integrazione" : ""}
                                            </Text>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        {hasAdmin && (
                                            <span style={{
                                                fontSize: "10px",
                                                padding: "2px 6px",
                                                borderRadius: "4px",
                                                background: "rgba(237, 66, 69, 0.2)",
                                                color: "#ED4245",
                                                fontWeight: "bold"
                                            }}>
                                                ADMIN
                                            </span>
                                        )}
                                        <span style={{
                                            fontSize: "10px",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            background: isAboveYou ? "rgba(237, 66, 69, 0.15)" : "rgba(87, 242, 135, 0.15)",
                                            color: isAboveYou ? "#ED4245" : "#57F287",
                                            fontWeight: "bold"
                                        }}>
                                            {isAboveYou ? "Superiore" : "Gestibile"}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab: Stato Canale */}
            {tab === "channels" && channel && (
                <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                    <div style={{ padding: "10px", background: "var(--background-secondary)", borderRadius: "6px", marginBottom: "10px" }}>
                        <Text variant="text-sm/bold">Dettagli Canale #{channel.name}</Text>
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", marginTop: "4px" }}>
                            ID Canale: {channel.id}
                        </Text>
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                            Categoria: {channel.parent_id ? ChannelStore.getChannel(channel.parent_id)?.name || channel.parent_id : "Nessuna"}
                        </Text>
                    </div>

                    <Text variant="text-sm/bold" style={{ marginBottom: "6px" }}>Sovrascritture Permessi (Overwrites):</Text>
                    {channel.permissionOverwrites && Object.keys(channel.permissionOverwrites).length > 0 ? (
                        Object.values(channel.permissionOverwrites).map((ow: any) => {
                            const isRole = ow.type === 0;
                            const targetName = isRole
                                ? `@${allRoles.find(r => r.id === ow.id)?.name || ow.id}`
                                : `Utente (${ow.id})`;

                            return (
                                <div key={ow.id} style={{
                                    padding: "8px",
                                    borderRadius: "4px",
                                    background: "var(--background-secondary)",
                                    marginBottom: "4px"
                                }}>
                                    <Text variant="text-sm/semibold">{targetName}</Text>
                                    <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                                        <Text variant="text-xs/normal" style={{ color: "#57F287" }}>
                                            Allow: 0x{BigInt(ow.allow || 0n).toString(16)}
                                        </Text>
                                        <Text variant="text-xs/normal" style={{ color: "#ED4245" }}>
                                            Deny: 0x{BigInt(ow.deny || 0n).toString(16)}
                                        </Text>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)" }}>
                            Nessuna sovrascrittura personalizzata: i permessi sono sincronizzati con la categoria o il server.
                        </Text>
                    )}
                </div>
            )}
        </div>
    );
}

function openUltraModal(guildId: string, channelId?: string, userId?: string) {
    openModal(props => (
        <Modal
            title="🛡️ PermissionUltraViewer"
            onClose={props.onClose}
            transitionState={1}
        >
            <UltraPermissionsView
                guildId={guildId}
                channelId={channelId}
                userId={userId}
                onClose={props.onClose}
            />
        </Modal>
    ));
}

function MenuItem(guildId: string, { id, type }: { id?: string; type?: MenuItemParentType; }) {
    return (
        <Menu.MenuItem
            id="puv-ultra-permissions"
            label="🛡️ UltraViewer Permessi & Gerarchia"
            action={() => {
                if (type === MenuItemParentType.User) openUltraModal(guildId, undefined, id);
                else if (type === MenuItemParentType.Channel) openUltraModal(guildId, id);
                else openUltraModal(guildId);
            }}
        />
    );
}

function makeContextMenuPatch(childId: string | string[], type?: MenuItemParentType): NavContextMenuPatchCallback {
    return (children, props) => {
        if (!props) return;
        const group = findGroupChildrenByChildId(childId, children);
        const item = type === MenuItemParentType.User
            ? MenuItem(props.guildId, { id: props.user?.id, type })
            : type === MenuItemParentType.Channel
                ? MenuItem(props.guild?.id, { id: props.channel?.id, type })
                : MenuItem(props.guild?.id, {});

        if (group) group.push(item);
        else children.splice(-1, 0, <Menu.MenuGroup>{item}</Menu.MenuGroup>);
    };
}

export default definePlugin({
    name: "PermissionUltraViewer",
    description: "Versione Ultra potenziata: visualizza lo stato di blocco dei canali (🔒/⚠️/🔓), la gerarchia ruoli completa, bitfield esadecimali e ruoli ereditati.",
    tags: ["Servers", "Roles", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    contextMenus: {
        "user-context": makeContextMenuPatch("roles", MenuItemParentType.User),
        "channel-context": makeContextMenuPatch(["mute-channel", "unmute-channel"], MenuItemParentType.Channel),
        "guild-context": makeContextMenuPatch("privacy", MenuItemParentType.Guild),
        "guild-header-popout": makeContextMenuPatch("privacy", MenuItemParentType.Guild)
    }
});
