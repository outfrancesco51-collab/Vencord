import { Devs } from "@utils/constants";
/*
 * Vencord - FavoriteChannels
 * Segnalibri rapidi per i canali più importanti da qualsiasi server in un unico comodo drawer.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelRouter, ChannelStore, Modal, openModal, SelectedChannelStore, showToast, Text, Toasts, useState } from "@webpack/common";

interface FavChannel {
    id: string;
    name: string;
    guildName?: string;
}

const settings = definePluginSettings({
    favoritesJson: {
        description: "Lista serializzata dei canali preferiti",
        type: OptionType.STRING,
        default: "[]"
    }
});

function getFavorites(): FavChannel[] {
    try {
        return JSON.parse(settings.store.favoritesJson);
    } catch {
        return [];
    }
}

function saveFavorites(list: FavChannel[]) {
    settings.store.favoritesJson = JSON.stringify(list);
}

function FavoritesModal({ onClose }: { onClose: () => void; }) {
    const [favorites, setFavorites] = useState<FavChannel[]>(getFavorites());
    const currentChannelId = SelectedChannelStore.getChannelId();

    const addCurrentChannel = () => {
        if (!currentChannelId) {
            showToast("Nessun canale attualmente selezionato.", Toasts.Type.FAILURE);
            return;
        }
        const ch = ChannelStore.getChannel(currentChannelId);
        if (!ch) return;

        if (favorites.some(f => f.id === currentChannelId)) {
            showToast("Canale già presente nei preferiti!", Toasts.Type.MESSAGE);
            return;
        }

        const updated = [...favorites, { id: currentChannelId, name: ch.name || currentChannelId }];
        setFavorites(updated);
        saveFavorites(updated);
        showToast(`⭐ Aggiunto #${ch.name || currentChannelId} ai preferiti!`, Toasts.Type.SUCCESS);
    };

    const removeChannel = (id: string) => {
        const updated = favorites.filter(f => f.id !== id);
        setFavorites(updated);
        saveFavorites(updated);
    };

    const jumpTo = (id: string) => {
        ChannelRouter?.transitionToChannel?.(id);
        onClose();
    };

    return (
        <Modal
            title="⭐ FavoriteChannels — Segnalibri Canali Rapidi"
            onClose={onClose}
            transitionState={1}
        >
            <div style={{ padding: "16px", minWidth: "420px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                        Passa ai tuoi canali chiave con un clic senza cercarli nei server:
                    </Text>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={addCurrentChannel}>
                        + Aggiungi Canale Corrente
                    </Button>
                </div>

                <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {favorites.length === 0 ? (
                        <Text variant="text-sm/normal" style={{ color: "var(--text-muted)", textAlign: "center", padding: "16px" }}>
                            Nessun canale preferito aggiunto. Clicca su "+ Aggiungi Canale Corrente" per iniziare.
                        </Text>
                    ) : (
                        favorites.map(fav => (
                            <div key={fav.id} style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 12px",
                                background: "var(--background-secondary)",
                                borderRadius: "6px"
                            }}>
                                <div style={{ cursor: "pointer", flex: 1 }} onClick={() => jumpTo(fav.id)}>
                                    <Text variant="text-sm/semibold">#{fav.name}</Text>
                                    <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                                        ID: {fav.id}
                                    </Text>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={() => jumpTo(fav.id)}>
                                        Vai
                                    </Button>
                                    <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => removeChannel(fav.id)}>
                                        ✕
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default definePlugin({
    name: "FavoriteChannels",
    description: "Salva i tuoi canali di testo e vocali preferiti da qualsiasi server per aprirli all'istante da un comodo menu.",
    tags: ["Utility", "Customisation"],
    authors: [Devs.Antigravity],
    settings,

    toolboxActions: {
        "⭐ Canali Preferiti (Bookmarks)": () => {
            openModal(props => <FavoritesModal onClose={props.onClose} />);
        }
    }
});
