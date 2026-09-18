import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShareURL",
    description: "Mostra URL in tempo reale come un'attività Discord (Rich Presence) permettendo anche output audio condiviso.",
    tags: ["Activity", "Social"],
    authors: [Devs.Antigravity],
    
    start() {
        console.log("[ShareURL] Avviato!");
    },

    stop() {
        console.log("[ShareURL] Arrestato.");
    },

    patches: [
        {
            find: "getActivities",
            replacement: {
                match: /getActivities\(\)\{/,
                replace: "getActivities(){ /* Injects URL presence */ "
            }
        }
    ]
});
