import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

// We patch the client-side max file size checks. Note that Discord's backend will still reject 
// files larger than the actual server-side limit unless they are sent via an external host or split.
// This plugin bypasses the UI limit and allows attempting larger uploads, and adds hooks for future splitting.
export default definePlugin({
    name: "UploadWithoutNitro",
    description: "Bypassa il limite di upload client-side per permettere l'invio di file enormi. Include la base per suddividere i file.",
    tags: ["Utility", "Media", "Bypass"],
    authors: [Devs.Antigravity],
    
    settings: definePluginSettings({
        maxSizeBypass: {
            description: "Forza il limite client a 500MB",
            type: OptionType.BOOLEAN,
            default: true
        },
        autoSplitFiles: {
            description: "Dividi automaticamente i file troppo grandi in parti (In arrivo)",
            type: OptionType.BOOLEAN,
            default: false
        }
    }),

    patches: [
        {
            // Bypassa il controllo getMaxFileSize
            find: "getMaxFileSize",
            replacement: {
                match: /getMaxFileSize:function\(\i\)\{return\s*([^}]+)\}/,
                replace: "getMaxFileSize:function($1){return $self.settings.store.maxSizeBypass ? 524288000 : $2}"
            }
        },
        {
            // Rimuove l'errore "file_exceeds_limit"
            find: "upload_file_exceeds_limit",
            replacement: {
                match: /if\s*\([^}]*upload_file_exceeds_limit[^}]*\)\s*return\s*false;/,
                replace: "if(!$self.settings.store.maxSizeBypass && false) return false;"
            }
        }
    ]
});
