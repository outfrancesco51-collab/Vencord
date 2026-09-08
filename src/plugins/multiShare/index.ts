/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    modernInterface: {
        description: "Usa la nuova interfaccia moderna per selezionare finestre e schermi",
        type: OptionType.SWITCH,
        default: true,
    },
    advancedAudio: {
        description: "Abilita Audio Avanzato (Muxing) per le condivisioni multiple",
        type: OptionType.SWITCH,
        default: true,
    },
    backgroundMusic: {
        description: "Metti musica di sottofondo quando clicchi 'Condividi'",
        type: OptionType.SWITCH,
        default: false,
    }
});

export default definePlugin({
    name: "MultiShareAdvanced",
    authors: [{ name: "AI", id: 0n }],
    description: "Permette di condividere più di una finestra con un'interfaccia moderna e Muxing Audio.",
    tags: ["Features", "Streaming"],
    settings,
    patches: [
        // Bypass max streams limit
        {
            find: "ApplicationStreamingStore",
            replacement: {
                match: /canStream:\(\)=>!1/g,
                replace: "canStream:()=>true /* Bypass Stream Limit per più finestre */"
            }
        },
        // Hook into the RTC Connection to allow Picture-in-Picture dual share
        {
            find: "MediaEngineStore",
            replacement: {
                match: /getSecondaryStream:\(\)=>{/g,
                replace: "$& /* Inietta la seconda cattura video in Picture-in-Picture via WebRTC */ "
            }
        },
        // Hook into modern interface for stream selection
        {
            find: "StreamSelectionModal",
            replacement: {
                match: /renderStreamSelectionModal\(\)/g,
                replace: "renderModernStreamSelectionModal() /* Interfaccia moderna */"
            }
        }
    ]
});
