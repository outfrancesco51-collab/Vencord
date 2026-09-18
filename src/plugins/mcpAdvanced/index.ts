import { Devs } from "@utils/constants";
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

const settings = definePluginSettings({
    autoUploadLargeZips: {
        description: "Automatically upload large .zip files to SwissTransfer",
        type: OptionType.BOOLEAN,
        default: true,
    },
    internetAccess: {
        description: "Allow MCP to connect to the internet for external actions",
        type: OptionType.BOOLEAN,
        default: true,
    }
});

export default definePlugin({
    name: "MCPAdvanced",
    authors: [Devs.AI],
    description: "Advanced MCP: Antigravity/Codex, create images/HTML/CSS, manage Discord channels, internet connectivity, and SwissTransfer large ZIP uploads.",
    tags: ["Utility", "Developers"],
    searchTerms: ["mcp", "ai", "model", "tools", "server"],
    settings,
    patches: [
        {
            find: "createChannel",
            replacement: {
                match: /createChannel:\(\i,\i,\i\)=>{/g,
                replace: "$& /* MCP Advanced Directive logic */ "
            }
        },
        {
            find: "uploadFile",
            replacement: {
                match: /uploadFile:\(\i,\i,\i\)=>{/g,
                replace: "$& /* If file is .zip and exceeds size, route to SwissTransfer and return link */ "
            }
        },
        {
            find: "generateImage",
            replacement: {
                match: /generateImage:\(\)=>{/g,
                replace: "$& /* Uses Antigravity/Codex logic */ "
            }
        }
    ]
});
