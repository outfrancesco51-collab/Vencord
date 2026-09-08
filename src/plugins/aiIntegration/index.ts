/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    apiEndpoint: {
        description: "API Endpoint (Llama.cpp / Unsloth / ecc.)",
        type: OptionType.STRING,
        default: "http://localhost:11434/api/generate",
    },
    recommendedModel: {
        description: "Seleziona un modello consigliato in base alla tua VRAM (Unsloth/GGUF)",
        type: OptionType.SELECT,
        options: [
            { label: "Manuale (scrivi sotto)", value: "custom" },
            { label: "8GB VRAM - Qwen 3.6B (Veloce) o Llama 3 8B (Q4)", value: "qwen:3.6b" },
            { label: "12GB VRAM - Gemma 2 9B o DeepSeek Coder 7B (Q5/Q6)", value: "gemma:9b" },
            { label: "24GB VRAM - Qwen 2 72B (Q2_K) o Mixtral 8x7B", value: "mixtral:8x7b" },
            { label: "Extreme - Kimi 3 / Claude / GPT4", value: "kimi:3" }
        ],
        default: "qwen:3.6b",
    },
    customModelName: {
        description: "Nome Modello Manuale (seleziona 'Manuale' sopra)",
        type: OptionType.STRING,
        default: "qwen:3.6b",
    },
    advancedFormat: {
        description: "Abilita Formattazione Avanzata (Markdown/Code highlights)",
        type: OptionType.SWITCH,
        default: true,
    },
    webSearch: {
        description: "Abilita Web Search per ricerche Internet",
        type: OptionType.SWITCH,
        default: true,
    }
});

export default definePlugin({
    name: "AI",
    authors: [{ name: "AI", id: 0n }],
    description: "Integrazione con Unsloth e LLM locali. Modelli ottimizzati per 8GB, 12GB e 24GB VRAM.",
    tags: ["AI", "Integration"],
    settings,
    patches: [
        {
            find: "sendMessage",
            replacement: {
                match: /sendMessage:\(\i,\i,\i,\i\)=>{/g,
                replace: "$& /* AI text injection logic */ "
            }
        }
    ]
});
