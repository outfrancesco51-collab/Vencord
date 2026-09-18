import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { Button } from "@webpack/common";

const settings = definePluginSettings({
    fakeMute: {
        description: "Risulta mutato agli altri",
        type: OptionType.BOOLEAN,
        default: false
    },
    fakeDeafen: {
        description: "Risulta sordo (Deafened) agli altri ma continua a sentire l'audio",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let originalSend: any;
let isFakeDeafened = false;

function toggleFakeDeafen() {
    isFakeDeafened = !isFakeDeafened;
    
    // Forza l'aggiornamento dello stato vocale inviando un payload vuoto o aggiornando il websocket
    const wsModule = findByProps("getSocket");
    if (!wsModule) return;
    
    const socket = wsModule.getSocket();
    const SelectedChannelStore = findByProps("getVoiceChannelId");
    const channelId = SelectedChannelStore?.getVoiceChannelId();
    const MediaEngineStore = findByProps("isDeaf", "isMute");
    
    if (socket && channelId) {
        socket.send(4, {
            guild_id: findByProps("getChannel")?.getChannel(channelId)?.guild_id ?? null,
            channel_id: channelId,
            self_mute: (isFakeDeafened && settings.store.fakeMute) || (MediaEngineStore?.isMute() ?? false),
            self_deaf: (isFakeDeafened && settings.store.fakeDeafen) || (MediaEngineStore?.isDeaf() ?? false),
            self_video: false,
            flags: 0
        });
    }
}

export default definePlugin({
    name: "MuteAndListen",
    description: "Permette di risultare 'Sordato' (Deafened) o Mutato agli altri, ma tu continui a sentire e parlare normalmente.",
    tags: ["Voice", "Utility", "Bypass"],
    authors: [Devs.Antigravity],
    settings,
    
    start() {
        const wsModule = findByProps("getSocket");
        if (!wsModule) {
            console.error("[MuteAndListen] ws module not found");
            return;
        }
        
        const socket = wsModule.getSocket();
        if (!socket) {
            console.error("[MuteAndListen] socket not found");
            return;
        }
        
        originalSend = socket.send;
        socket.send = function (op: number, data: any, ...args: any[]) {
            // op code 4 = voiceStateUpdate
            if (op === 4 && isFakeDeafened && data) {
                if (settings.store.fakeMute) data.self_mute = true;
                if (settings.store.fakeDeafen) data.self_deaf = true;
            }
            return originalSend.apply(this, [op, data, ...args]);
        };
        
        console.log("[MuteAndListen] Avviato!");
    },
    
    stop() {
        const wsModule = findByProps("getSocket");
        if (wsModule) {
            const socket = wsModule.getSocket();
            if (socket && originalSend) {
                socket.send = originalSend;
            }
        }
        console.log("[MuteAndListen] Arrestato.");
    },

    patches: [
        {
            // Aggiungi un pulsante alla Account Popout/Voice Panel per attivare il Fake Deafen
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: {
                match: /children:\[(?=[^\]]*accountContainerRef)/,
                replace: "children:[$self.renderButton(), "
            }
        }
    ],

    renderButton() {
        // Render a tiny toggle button
        return (
            <div 
                onClick={() => {
                    toggleFakeDeafen();
                    // trigger a tiny toast or alert maybe?
                }}
                style={{
                    padding: "4px", 
                    cursor: "pointer", 
                    color: isFakeDeafened ? "var(--status-danger)" : "var(--interactive-normal)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
                title={isFakeDeafened ? "MuteAndListen Attivo" : "MuteAndListen Disattivo"}
            >
                {isFakeDeafened ? "🎧❌" : "🎧"}
            </div>
        );
    }
});
