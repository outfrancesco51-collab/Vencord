import { Devs } from "@utils/constants";
/*
 * Vencord - MediaDownloaderPlus
 * Aggiunge opzioni rapide per copiare link originali ad alta risoluzione o scaricare file multimediali.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import { Menu, showToast, Toasts } from "@webpack/common";

function makeImageMenuPatch(): NavContextMenuPatchCallback {
    return (children, props) => {
        if (!props?.src && !props?.target?.src) return;

        const srcUrl: string = props.src || props.target?.src || "";
        // Rimuovi parametri di resize Discord per ottenere il file originale al 100%
        const cleanUrl = srcUrl.replace(/\?width=\d+&height=\d+.*$/, "");

        const downloadItem = (
            <Menu.MenuItem
                id="mdp-copy-original"
                label="📥 Copia Link Originale Alta Risoluzione"
                action={() => {
                    navigator.clipboard.writeText(cleanUrl);
                    showToast("Link CDN originale copiato!", Toasts.Type.SUCCESS);
                }}
            />
        );

        const openItem = (
            <Menu.MenuItem
                id="mdp-open-original"
                label="🌐 Apri Media a Risoluzione Massima"
                action={() => {
                    window.open(cleanUrl, "_blank");
                }}
            />
        );

        children.push(
            <Menu.MenuSeparator />,
            <Menu.MenuGroup>
                {downloadItem}
                {openItem}
            </Menu.MenuGroup>
        );
    };
}

export default definePlugin({
    name: "MediaDownloaderPlus",
    description: "Permette di copiare il link originale alla massima risoluzione o aprire direttamente immagini e video rimuovendo i filtri di compressione Discord.",
    tags: ["Media", "Utility"],
    authors: [Devs.Antigravity],

    contextMenus: {
        "image-context": makeImageMenuPatch(),
        "message": (children, props) => {
            const attachment = props?.message?.attachments?.[0];
            if (!attachment?.url) return;

            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id="mdp-copy-attachment"
                    label="📥 Copia Link Allegato Originale"
                    action={() => {
                        navigator.clipboard.writeText(attachment.url);
                        showToast("Link allegato originale copiato!", Toasts.Type.SUCCESS);
                    }}
                />
            );
        }
    }
});
