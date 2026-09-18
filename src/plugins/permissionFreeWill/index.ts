/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    lockout: {
        type: OptionType.BOOLEAN,
        default: true,
        description: 'Bypass the permission lockout prevention ("Pretty sure you don\'t want to do this")',
        restartNeeded: true
    },
    onboarding: {
        type: OptionType.BOOLEAN,
        default: true,
        description: 'Bypass the onboarding requirements ("Making this change will make your server incompatible [...]")',
        restartNeeded: true
    },
    viewTickets: {
        type: OptionType.BOOLEAN,
        default: true,
        description: 'Vedi i ticket e i canali privati bypassando le restrizioni di visualizzazione (VIEW_CHANNEL)',
        restartNeeded: true
    }
});

export default definePlugin({
    name: "PermissionFreeWill & Ticket Viewer",
    description: "Modifica pesante: Disabilita le restrizioni lato client per i permessi e permette di vedere i ticket e i canali nascosti bypassando VIEW_CHANNEL.",
    tags: ["Servers", "Roles", "Utility"],
    authors: [Devs.lewisakura, Devs.Antigravity],

    patches: [
        // Permission lockout, just set the check to true
        {
            find: "#{intl::STAGE_CHANNEL_CANNOT_OVERWRITE_PERMISSION}",
            replacement: [
                {
                    match: /case"DENY":.{0,50}if\((?=\i\.\i\.can)/,
                    replace: "$&true||"
                }
            ],
            predicate: () => settings.store.lockout
        },
        // Onboarding, same thing but we need to prevent the check
        {
            find: "#{intl::ONBOARDING_CHANNEL_THRESHOLD_WARNING}",
            replacement: [
                {
                    // replace export getters with functions that always resolve to true
                    match: /{(?:\i:\(\)=>\i,?){2}}/,
                    replace: m => m.replaceAll(canonicalizeMatch(/\(\)=>\i/g), "()=>()=>Promise.resolve(true)")
                }
            ],
            predicate: () => settings.store.onboarding
        },
        // Heavy Modification: Bypass VIEW_CHANNEL and isHidden to see Tickets
        {
            find: "isPrivate()",
            replacement: [
                {
                    match: /isHidden\(\){return [^}]+}/g,
                    replace: "isHidden(){return false;}"
                }
            ],
            predicate: () => settings.store.viewTickets
        },
        // Force PermissionStore to return true for VIEW_CHANNEL (1024n = 0x400n)
        {
            find: "hasBaseAccessLevel",
            replacement: [
                {
                    match: /can:function\((\i),(\i)\){/g,
                    replace: "can:function($1,$2){if($1===1024n)return true; "
                }
            ],
            predicate: () => settings.store.viewTickets
        }
    ],
    settings
});
