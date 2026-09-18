import { Devs } from "@utils/constants";
/*
 * Vencord OS Themes & Interface Overhaul
 * Windows XP (Default), Windows 11, Windows 10 Dark/Light, Windows 8, Windows 7, Windows 2000, Ubuntu
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import myPluginStyle from "./style.css?managed";

export const themeOptions = [
    { label: "🪟 Windows XP (Luna Blue - Predefinito)", value: "winxp", default: true },
    { label: "✨ Windows 11 (Fluent & Mica)", value: "win11" },
    { label: "⬛ Windows 10 Dark (Metro Flat)", value: "win10dark" },
    { label: "⬜ Windows 10 Light (Metro Flat)", value: "win10light" },
    { label: "🟦 Windows 8 (Modern Tiles)", value: "win8" },
    { label: "💎 Windows 7 (Aero Glass & Glow)", value: "win7" },
    { label: "💾 Windows 2000 (Classic NT Pro)", value: "win2000" },
    { label: "🟠 Ubuntu (Yaru Aubergine & Orange)", value: "ubuntu" },
    { label: "🚫 Disabilitato (Discord Default)", value: "none" }
];

function applyTheme(themeKey: string) {
    if (themeKey === "none") {
        document.documentElement.removeAttribute("data-os-theme");
    } else {
        document.documentElement.setAttribute("data-os-theme", themeKey);
    }
}

const settings = definePluginSettings({
    themeType: {
        description: "Seleziona lo stile interfaccia OS desiderato (Default: Windows XP)",
        type: OptionType.SELECT,
        options: themeOptions,
        default: "winxp",
        onChange(newValue: string) {
            applyTheme(newValue);
            showToast(`🎨 Tema applicato: ${newValue.toUpperCase()}`, Toasts.Type.SUCCESS);
        }
    }
});

export default definePlugin({
    name: "CustomUITheme",
    authors: [Devs.Antigravity],
    description: "Sistema completo di temi OS per Discord: Windows XP (predefinito), Windows 11, Windows 10 Dark/Light, Windows 8, Windows 7, Windows 2000 e Ubuntu.",
    tags: ["Appearance", "Customisation"],
    settings,
    managedStyle: myPluginStyle,

    start() {
        applyTheme(settings.store.themeType || "winxp");
    },

    stop() {
        document.documentElement.removeAttribute("data-os-theme");
    },

    toolboxActions: {
        "🎨 Cambia Stile OS (Retro/Modern)": () => {
            const current = settings.store.themeType || "winxp";
            const currentIndex = themeOptions.findIndex(o => o.value === current);
            const nextIndex = (currentIndex + 1) % (themeOptions.length - 1); // exclude 'none' on cycle
            const nextTheme = themeOptions[nextIndex].value;
            settings.store.themeType = nextTheme;
            applyTheme(nextTheme);
            showToast(`🎨 Stile OS: ${themeOptions[nextIndex].label}`, Toasts.Type.SUCCESS);
        }
    }
});
