import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "UploadWithoutNitro",
    description: "Permette di gestire upload di file di grandi dimensioni compattandoli o suddividendoli, aggirando i limiti di upload di Discord.",
    tags: ["Utility", "Media"],
    authors: [Devs.Antigravity],
    
    patches: [
        {
            find: "upload_file_exceeds_limit", // Punto di hook per l'intercettazione dell'upload
            replacement: {
                match: /if\s*\([^}]*upload_file_exceeds_limit[^}]*\)\s*return\s*false;/,
                replace: "return true;"
            }
        }
    ],

    start() {
        console.log("[UploadWithoutNitro] Avviato!");
    },
    stop() {
        console.log("[UploadWithoutNitro] Arrestato.");
    }
});
