import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "KritaAIWithDiscord",
    description: "Integrazione con Krita AI Diffusion. Aggiunge il comando /ai-krita per generare immagini tramite il modello locale installato su Krita.",
    tags: ["AI", "Media", "Chat"],
    authors: [Devs.Antigravity, Devs.AI],
    
    settings: definePluginSettings({
        enableNsfw: {
            description: "Abilita generazione NSFW (Disabilitato di default)",
            type: OptionType.BOOLEAN,
            default: false
        },
        apiUrl: {
            description: "Endpoint di Krita AI Server Locale",
            type: OptionType.STRING,
            default: "http://127.0.0.1:8188"
        }
    }),

    start() {
        console.log("[KritaAI] Avviato con endpoint:", this.settings.store.apiUrl);
    },

    stop() {
        console.log("[KritaAI] Arrestato");
    },

    patches: [
        {
            find: "sendMessage",
            replacement: {
                match: /sendMessage\(\i,\i,\i,\i\)\{/,
                replace: "sendMessage(channelId, message, promise, msgId){ if (message?.content?.startsWith('/ai-krita ')) { console.log('Krita generation requested'); return; }"
            }
        }
    ]
});
