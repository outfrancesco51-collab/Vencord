/*
 * Vencord - SoundBoardFreeNitro
 * Sblocca tutti i suoni della soundboard cross-server
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "SoundBoardFreeNitro",
    description: "Sblocca tutti i suoni della soundboard da altri server come se avessi Nitro, copiando il bypass reale di FakeNitro.",
    tags: ["Voice", "Media", "Utility", "Bypass"],
    authors: [Devs.Antigravity],
    
    patches: [
        {
            find: 'type:"GUILD_SOUNDBOARD_SOUND_CREATE"',
            replacement: {
                match: /(?<=type:"(?:SOUNDBOARD_SOUNDS_RECEIVED|GUILD_SOUNDBOARD_SOUND_CREATE|GUILD_SOUNDBOARD_SOUND_UPDATE|GUILD_SOUNDBOARD_SOUNDS_UPDATE)".+?available:)\i\.available/g,
                replace: "true"
            }
        }
    ]
});
