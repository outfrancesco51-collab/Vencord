import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "SoundBoardFreeNitro",
    description: "Sblocca tutti i suoni della soundboard da altri server come se avessi Nitro al massimo.",
    tags: ["Voice", "Media", "Utility", "Bypass"],
    authors: [Devs.Antigravity],
    
    patches: [
        {
            // Bypassa il blocco locale "available" per visualizzare i suoni non sbloccati
            find: 'type:"GUILD_SOUNDBOARD_SOUND_CREATE"',
            replacement: {
                match: /(?<=type:"(?:SOUNDBOARD_SOUNDS_RECEIVED|GUILD_SOUNDBOARD_SOUND_CREATE|GUILD_SOUNDBOARD_SOUND_UPDATE|GUILD_SOUNDBOARD_SOUNDS_UPDATE)".+?available:)\i\.available/g,
                replace: "true"
            }
        },
        {
            // Bypassa la restrizione che blocca l'invio di suoni cross-server senza Nitro (clickability)
            find: "canUseSoundboardEmojiFromOtherGuilds",
            replacement: {
                match: /canUseSoundboardEmojiFromOtherGuilds\([^)]*\)\s*\{/,
                replace: "$& return true;"
            }
        },
        {
            // Abilita globalmente la soundboard se fosse disabilitata per l'utente
            find: "canUseSoundboard",
            replacement: {
                match: /canUseSoundboard\([^)]*\)\s*\{/,
                replace: "$& return true;"
            }
        }
    ]
});
