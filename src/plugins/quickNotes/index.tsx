import { Devs } from "@utils/constants";
/*
 * Vencord - QuickNotes
 * Blocco note personale integrato in Discord per salvare idee, promemoria e snippet veloci.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Modal, openModal, TextArea, Text, Toasts, showToast, useState } from "@webpack/common";

const settings = definePluginSettings({
    notes: {
        description: "Contenuto dei tuoi appunti personali salvati",
        type: OptionType.STRING,
        default: "# Note Personali Discord\n\n- Scrivi qui i tuoi appunti veloci!\n- Link utili, ID server, promemoria\n"
    }
});

function NotesModal({ onClose }: { onClose: () => void; }) {
    const [content, setContent] = useState(settings.store.notes);

    const handleSave = () => {
        settings.store.notes = content;
        showToast("💾 Note salvate con successo!", Toasts.Type.SUCCESS);
        onClose();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        showToast("📋 Note copiate negli appunti!", Toasts.Type.SUCCESS);
    };

    return (
        <Modal
            title="📝 QuickNotes — Blocco Note Personale"
            onClose={onClose}
            transitionState={1}
        >
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", minWidth: "460px" }}>
                <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                    I tuoi appunti rimangono salvati localmente sul tuo client Vencord.
                </Text>
                <TextArea
                    value={content}
                    onChange={(val: string) => setContent(val)}
                    rows={14}
                    style={{
                        width: "100%",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        resize: "vertical"
                    }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.PRIMARY}
                        onClick={handleCopy}
                    >
                        📋 Copia Tutto
                    </Button>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.PRIMARY}
                            onClick={onClose}
                        >
                            Annulla
                        </Button>
                        <Button
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.BRAND}
                            onClick={handleSave}
                        >
                            Salva
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default definePlugin({
    name: "QuickNotes",
    description: "Blocco note personale integrato in Discord per salvare idee, promemoria e snippet veloci direttamente dal client.",
    tags: ["Utility", "Customisation"],
    authors: [Devs.Antigravity],
    settings,

    toolboxActions: {
        "📝 Apri QuickNotes": () => {
            openModal(props => <NotesModal onClose={props.onClose} />);
        }
    }
});
