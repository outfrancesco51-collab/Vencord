/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
// Use the managed import for CSS injection
import myPluginStyle from "./style.css?managed";

const settings = definePluginSettings({
    themeType: {
        description: "Select UI Theme (Requires restart or toggle plugin)",
        type: OptionType.SELECT,
        options: [
            { label: "None", value: "none" },
            { label: "Windows XP / Vista Vibe", value: "winxp" }
        ],
        default: "none",
    }
});

export default definePlugin({
    name: "CustomStyle",
    authors: [{ name: "AI", id: 0n }],
    description: "Applies full UI overhauls like Windows XP, Windows Vista using proper Vencord CSS injection.",
    tags: ["Theme", "Appearance"],
    settings,
    
    // Automatically injects/removes style when plugin starts/stops!
    managedStyle: myPluginStyle,

    start() {
        console.log("CustomStyle Plugin started!");
    },
    
    stop() {
        console.log("CustomStyle Plugin stopped!");
    }
});
