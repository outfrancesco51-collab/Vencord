import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    enableShake: {
        description: "Abilita il tremolio della campanella",
        type: OptionType.BOOLEAN,
        default: true
    }
});

let unreadCount = 0;

export default definePlugin({
    name: "RememberNotify",
    description: "Aggiunge una campanella pulsante sopra il logo di Discord che trema quando ricevi messaggi, mostrando il numero esatto.",
    tags: ["UI", "Chat", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    start() {
        this.injectCSS();
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.onMessage);
        FluxDispatcher.subscribe("CHANNEL_ACK", this.onAck);
    },

    stop() {
        this.removeCSS();
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.onMessage);
        FluxDispatcher.unsubscribe("CHANNEL_ACK", this.onAck);
    },

    onMessage(e: any) {
        // Increment unreads or calculate exact unreads globally
        unreadCount++;
        document.body.style.setProperty("--rn-unread-count", `"${unreadCount}"`);
        document.body.classList.add("rn-shake");
        setTimeout(() => document.body.classList.remove("rn-shake"), 500);
    },

    onAck() {
        unreadCount = 0;
        document.body.style.setProperty("--rn-unread-count", `""`);
    },

    injectCSS() {
        const style = document.createElement("style");
        style.id = "remember-notify-css";
        style.textContent = `
            /* The Discord Home Button badge container */
            [class*="tutorialContainer_"] .wrapper_c5f96a::before {
                content: var(--rn-unread-count, "");
                position: absolute;
                top: -10px;
                right: -5px;
                background: #f23f43;
                color: white;
                font-size: 12px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 50%;
                z-index: 999;
                box-shadow: 0 0 5px rgba(242, 63, 67, 0.8);
                opacity: var(--rn-unread-count) ? 1 : 0;
                transition: opacity 0.2s;
                pointer-events: none;
            }
            [class*="tutorialContainer_"] .wrapper_c5f96a::after {
                content: "🔔";
                position: absolute;
                top: -25px;
                right: 0px;
                font-size: 20px;
                z-index: 998;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            }
            body[style*="--rn-unread-count"] [class*="tutorialContainer_"] .wrapper_c5f96a::after {
                opacity: 1;
            }

            @keyframes rnShake {
                0% { transform: rotate(0deg); }
                25% { transform: rotate(15deg); }
                50% { transform: rotate(-15deg); }
                75% { transform: rotate(15deg); }
                100% { transform: rotate(0deg); }
            }

            .rn-shake [class*="tutorialContainer_"] .wrapper_c5f96a::after {
                animation: rnShake 0.4s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    },

    removeCSS() {
        const style = document.getElementById("remember-notify-css");
        if (style) style.remove();
    }
});
