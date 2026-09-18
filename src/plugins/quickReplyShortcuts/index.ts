import { Devs } from "@utils/constants";
/*
 * Vencord - QuickReplyShortcuts
 * Espande automaticamente macro e scorciatoie di testo prima dell'invio del messaggio.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const defaultShortcuts: Record<string, string> = {
    ":shrug:": "¯\\_(ツ)_/¯",
    ":tableflip:": "(╯°□°)╯︵ ┻━┻",
    ":unflip:": "┬─┬ノ( º _ ºノ)",
    ":lenny:": "( ͡° ͜ʖ ͡°)",
    ":brb:": "☕ Torno subito!",
    ":afk:": "💤 Al momento sono AFK, risponderò appena possibile."
};

const settings = definePluginSettings({
    enableDefaultMacros: {
        description: "Abilita scorciatoie predefinite (:shrug:, :tableflip:, :lenny:, :brb:, :afk:)",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "QuickReplyShortcuts",
    description: "Espande scorciatoie di testo in simpatici kaomoji o risposte rapide prima dell'invio in chat.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Antigravity],
    settings,

    onBeforeMessageSend(channelId, msg) {
        if (!msg || !msg.content || !settings.store.enableDefaultMacros) return;

        let content = msg.content;
        for (const [shortcut, replacement] of Object.entries(defaultShortcuts)) {
            if (content.includes(shortcut)) {
                content = content.replaceAll(shortcut, replacement);
            }
        }
        msg.content = content;
    }
});
