import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    enabled: {
        description: "Abilita Integrazione MCP (Model Context Protocol)",
        type: OptionType.BOOLEAN,
        default: true
    },
    apiUrl: {
        description: "Endpoint API Locale (es. http://127.0.0.1:8080/v1 per Unsloth/Ollama)",
        type: OptionType.STRING,
        default: "http://127.0.0.1:8080/v1"
    },
    systemPrompt: {
        description: "Prompt di Sistema per i tool",
        type: OptionType.STRING,
        default: "Sei un assistente AI integrato in Discord tramite MCP."
    }
});

export default definePlugin({
    name: "MCPAdvanced",
    description: "Integrazione avanzata del Model Context Protocol. Permette di interfacciarsi con Unsloth.ai, Ollama e altri modelli locali tramite un bottone ON/OFF e API dirette.",
    tags: ["AI", "API", "Utility"],
    authors: [Devs.Antigravity, Devs.AI],
    searchTerms: ["mcp", "ai", "model", "tools", "server", "unsloth", "ollama"],
    settings,

    start() {
        console.log("[MCPAdvanced] Plugin Avviato con stato:", this.settings.store.enabled);
    },

    stop() {
        console.log("[MCPAdvanced] Plugin Arrestato.");
    },

    patches: [
        {
            find: "sendMessage",
            replacement: {
                match: /sendMessage\(\i,\i,\i,\i\)\{/,
                replace: "sendMessage(channelId, message, promise, msgId){ if ($self.settings.store.enabled && message?.content?.startsWith('/mcp ')) { console.log('Intercepted MCP command!'); return; }"
            }
        }
    ]
});
