import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ShowCodeYourFriends",
    description: "Permette di scrivere codice Python in Discord e farlo giocare agli amici tramite un mini-player integrato (Pygame, Matplotlib, Numpy).",
    tags: ["Game", "Utility", "Developers"],
    authors: [Devs.Antigravity],
    
    start() {
        console.log("[ShowCodeYourFriends] Avviato!");
    },

    stop() {
        console.log("[ShowCodeYourFriends] Arrestato.");
    },

    patches: [
        {
            find: "renderEmbed",
            replacement: {
                match: /renderEmbed\(\i\)\{/,
                replace: "renderEmbed(embed){ /* Inject python environment runner if code block is detected */ "
            }
        }
    ]
});
