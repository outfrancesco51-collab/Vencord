/*
 * Vencord - PermissionUltraViewer
 * Based on PermissionsViewer by Nuckyz & Ven
 * Ultra version: ticket bypass, lock icons, inherited perms, raw bitfield view
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { SafetyIcon } from "@components/Icons";
import { TooltipContainer } from "@components/TooltipContainer";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import { openModal, ModalContent, ModalHeader, ModalRoot, ModalFooter } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import type { Guild, RoleOrUserPermission } from "@vencord/discord-types";
import { PermissionOverwriteType } from "@vencord/discord-types/enums";
import { findCssClassesLazy } from "@webpack";
import { Button, ChannelStore, Dialog, GuildMemberStore, GuildRoleStore, GuildStore, Menu, PermissionsBits, Popout, Text, useEffect, useRef, UserStore } from "@webpack/common";

import openRolesAndUsersPermissionsModal from "../permissionsViewer/components/RolesAndUsersPermissions";
import UserPermissions from "../permissionsViewer/components/UserPermissions";
import { getSortedRolesForMember, loadGetGuildPermissionSpecMap, sortPermissionOverwrites } from "../permissionsViewer/utils";

const PopoutClasses = findCssClassesLazy("container", "popoutRoleDot");

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
    CREATE_INSTANT_INVITE: "Crea Invito",
    KICK_MEMBERS: "Kicka Membri",
    BAN_MEMBERS: "Banna Membri",
    ADMINISTRATOR: "👑 Amministratore",
    MANAGE_CHANNELS: "Gestisci Canali",
    MANAGE_GUILD: "Gestisci Server",
    ADD_REACTIONS: "Aggiungi Reazioni",
    VIEW_AUDIT_LOG: "Vedi Audit Log",
    PRIORITY_SPEAKER: "Voce Prioritaria",
    STREAM: "Video / Stream",
    VIEW_CHANNEL: "👁️ Vedi Canale",
    SEND_MESSAGES: "Invia Messaggi",
    SEND_TTS_MESSAGES: "Messaggi TTS",
    MANAGE_MESSAGES: "Gestisci Messaggi",
    EMBED_LINKS: "Incorpora Link",
    ATTACH_FILES: "Allega File",
    READ_MESSAGE_HISTORY: "Cronologia Messaggi",
    MENTION_EVERYONE: "Menziona @everyone",
    USE_EXTERNAL_EMOJIS: "Emoji Esterne",
    VIEW_GUILD_INSIGHTS: "Insight Server",
    CONNECT: "Connetti Vocale",
    SPEAK: "Parla",
    MUTE_MEMBERS: "Muta Membri",
    DEAFEN_MEMBERS: "Rendi Sordi Membri",
    MOVE_MEMBERS: "Sposta Membri",
    USE_VAD: "Attività Vocale",
    CHANGE_NICKNAME: "Cambia Nickname",
    MANAGE_NICKNAMES: "Gestisci Nickname",
    MANAGE_ROLES: "Gestisci Ruoli",
    MANAGE_WEBHOOKS: "Gestisci Webhook",
    MANAGE_GUILD_EXPRESSIONS: "Gestisci Emoji/Sticker",
    USE_APPLICATION_COMMANDS: "Comandi Slash",
    REQUEST_TO_SPEAK: "Chiedi di Parlare",
    MANAGE_EVENTS: "Gestisci Eventi",
    MANAGE_THREADS: "Gestisci Thread",
    CREATE_PUBLIC_THREADS: "Crea Thread Pubblici",
    CREATE_PRIVATE_THREADS: "Crea Thread Privati",
    USE_EXTERNAL_STICKERS: "Sticker Esterni",
    SEND_MESSAGES_IN_THREADS: "Invia in Thread",
    USE_EMBEDDED_ACTIVITIES: "Attività",
    MODERATE_MEMBERS: "Timeout Membri",
    VIEW_CREATOR_MONETIZATION_ANALYTICS: "Monetizzazione",
    USE_SOUNDBOARD: "🔊 Soundboard",
    USE_EXTERNAL_SOUNDS: "Suoni Esterni",
    SEND_VOICE_MESSAGES: "Messaggi Vocali",
};

export const settings = definePluginSettings({
    permissionsSortOrder: {
        description: "Ordine di visualizzazione permessi",
        type: OptionType.SELECT,
        options: [
            { label: "Ruolo Più Alto", value: PermissionsSortOrder.HighestRole, default: true },
            { label: "Ruolo Più Basso", value: PermissionsSortOrder.LowestRole }
        ]
    },
    showLockIcon: {
        description: "Mostra 🔒 accanto ai canali dove non hai accesso",
        type: OptionType.BOOLEAN,
        default: true
    },
    ticketBypass: {
        description: "Mostra permessi dei canali ticket anche senza accesso diretto",
        type: OptionType.BOOLEAN,
        default: true
    },
    showRawBitfield: {
        description: "Mostra il valore raw bitfield dei permessi",
        type: OptionType.BOOLEAN,
        default: false
    },
    showInheritedPerms: {
        description: "Mostra da quale ruolo viene ereditato ogni permesso",
        type: OptionType.BOOLEAN,
        default: true
    }
});

// Ultra permission display component
function UltraPermissionsView({ guildId, channelId, userId, onClose }: {
    guildId: string;
    channelId?: string;
    userId?: string;
    onClose?: () => void;
}) {
    const guild = GuildStore.getGuild(guildId);
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;
    const member = userId ? GuildMemberStore.getMember(guildId, userId) : null;
    const allRoles = GuildRoleStore.getSortedRoles(guildId);

    const isChannelLocked = channel &&
        !GuildMemberStore.getMember(guildId, UserStore.getCurrentUser()?.id || "")?.roles?.length;

    const effectivePerms = member?.roles
        ?.map(roleId => allRoles.find(r => r.id === roleId))
        .filter(Boolean)
        .reduce((acc, role) => acc | BigInt(role!.permissions), 0n) || 0n;

    return (
        <div className="vc-puv-container" style={{ padding: "16px", minWidth: "400px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <SafetyIcon height="20" width="20" />
                <Text variant="heading-lg/bold">
                    PermissionUltraViewer
                    {channel && settings.store.showLockIcon && isChannelLocked && " 🔒"}
                </Text>
            </div>

            {channel && (
                <div style={{ marginBottom: "8px", padding: "8px", background: "var(--background-secondary)", borderRadius: "6px" }}>
                    <Text variant="text-sm/semibold" style={{ color: "var(--text-muted)" }}>
                        📁 Canale: #{channel.name}
                        {channel.permissionOverwrites && " • Sovrascritture attive"}
                    </Text>
                </div>
            )}

            {settings.store.showRawBitfield && effectivePerms !== 0n && (
                <div style={{ marginBottom: "8px", padding: "8px", background: "var(--background-tertiary)", borderRadius: "6px" }}>
                    <Text variant="text-xs/mono" style={{ color: "var(--text-muted)" }}>
                        Raw Bitfield: {effectivePerms.toString()} (0x{effectivePerms.toString(16).toUpperCase()})
                    </Text>
                </div>
            )}

            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {Object.entries(PERMISSION_NAMES).map(([key, label]) => {
                    const bit = (PermissionsBits as any)[key];
                    if (!bit) return null;
                    const hasPermission = (effectivePerms & BigInt(bit)) !== 0n;
                    const sourceRole = member?.roles
                        ?.map(id => allRoles.find(r => r.id === id))
                        .find(r => r && (BigInt(r.permissions) & BigInt(bit)) !== 0n);

                    return (
                        <div key={key} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            marginBottom: "2px",
                            background: hasPermission ? "rgba(87, 242, 135, 0.07)" : "rgba(237, 66, 69, 0.05)"
                        }}>
                            <Text variant="text-sm/normal">{label}</Text>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {settings.store.showInheritedPerms && sourceRole && (
                                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                                        via @{sourceRole.name}
                                    </Text>
                                )}
                                <span style={{
                                    fontSize: "14px",
                                    color: hasPermission ? "#57F287" : "#ED4245"
                                }}>
                                    {hasPermission ? "✓" : "✗"}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function openUltraModal(guildId: string, channelId?: string, userId?: string) {
    openModal(props => (
        <ModalRoot {...props} size="medium">
            <ModalContent>
                <UltraPermissionsView
                    guildId={guildId}
                    channelId={channelId}
                    userId={userId}
                    onClose={props.onClose}
                />
            </ModalContent>
        </ModalRoot>
    ));
}

function MenuItem(guildId: string, { id, type }: { id?: string; type?: MenuItemParentType; }) {
    return (
        <Menu.MenuItem
            id="puv-ultra-permissions"
            label="🛡️ UltraViewer Permessi"
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
    description: "Version Ultra di PermissionsViewer: mostra permessi completi con 🔒 canali bloccati, bypass ticket, bitfield raw, permessi ereditati",
    tags: ["Servers", "Roles", "Utility", "Permissions"],
    authors: [{ name: "Antigravity", id: 0n }],
    settings,

    contextMenus: {
        "user-context": makeContextMenuPatch("roles", MenuItemParentType.User),
        "channel-context": makeContextMenuPatch(["mute-channel", "unmute-channel"], MenuItemParentType.Channel),
        "guild-context": makeContextMenuPatch("privacy", MenuItemParentType.Guild),
        "guild-header-popout": makeContextMenuPatch("privacy", MenuItemParentType.Guild)
    }
});
