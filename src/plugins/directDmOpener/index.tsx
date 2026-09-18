import { Devs } from "@utils/constants";
/*
 * Vencord - DirectDmOpener
 * Apre o crea direttamente una chat privata con qualsiasi ID utente Discord.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelRouter, Modal, openModal, RestAPI, showToast, Text, TextInput, Toasts, useState } from "@webpack/common";

const settings = definePluginSettings({
    lastOpenedUserId: {
        description: "Ultimo ID utente contattato via Direct DM",
        type: OptionType.STRING,
        default: ""
    }
});

async function openDirectDm(targetUserId: string) {
    if (!targetUserId || !/^\d{17,20}$/.test(targetUserId.trim())) {
        showToast("ID utente non valido! Deve contenere 17-20 cifre.", Toasts.Type.FAILURE);
        return;
    }

    try {
        const res = await RestAPI.post({
            url: "/users/@me/channels",
            body: { recipients: [targetUserId.trim()] }
        });

        if (res.body?.id) {
            settings.store.lastOpenedUserId = targetUserId.trim();
            ChannelRouter?.transitionToChannel?.(res.body.id);
            showToast("💬 Chat DM aperta con successo!", Toasts.Type.SUCCESS);
        } else {
            showToast("Impossibile aprire il DM con questo utente.", Toasts.Type.FAILURE);
        }
    } catch (err: any) {
        showToast(`Errore apertura DM: ${err?.message || "Privacy utente chiusa"}`, Toasts.Type.FAILURE);
    }
}

function DirectDmModal({ onClose }: { onClose: () => void; }) {
    const [userId, setUserId] = useState(settings.store.lastOpenedUserId || "");

    const handleSubmit = async () => {
        await openDirectDm(userId);
        onClose();
    };

    return (
        <Modal
            title="✉️ DirectDmOpener — Apri DM Diretto"
            onClose={onClose}
            transitionState={1}
        >
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minWidth: "380px" }}>
                <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                    Inserisci l'ID Discord dell'utente (17-20 cifre) per aprire direttamente la chat privata:
                </Text>
                <TextInput
                    value={userId}
                    placeholder="Es. 123456789012345678"
                    onChange={(val: string) => setUserId(val)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY} onClick={onClose}>
                        Annulla
                    </Button>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={handleSubmit}>
                        Apri Conversazione
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export default definePlugin({
    name: "DirectDmOpener",
    description: "Permette di aprire all'istante una chat privata (DM) con qualsiasi ID utente Discord senza dover inviare la richiesta di amicizia.",
    tags: ["Utility", "Friends", "Chat"],
    authors: [Devs.Antigravity],
    settings,

    toolboxActions: {
        "✉️ Apri DM per ID Utente": () => {
            openModal(props => <DirectDmModal onClose={props.onClose} />);
        }
    }
});
