import { Devs } from "@utils/constants";
/*
 * Vencord - ClipboardFormatter
 * Strumento rapido per formattare testi in sintassi Discord (Timestamp, Spoiler, Codeblock, Quote).
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { Button, Modal, openModal, showToast, Text, TextArea, Toasts, useState } from "@webpack/common";

function FormatterModal({ onClose }: { onClose: () => void; }) {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");

    const formatCodeblock = (lang = "ts") => {
        const res = `\`\`\`${lang}\n${input}\n\`\`\``;
        setOutput(res);
        navigator.clipboard.writeText(res);
        showToast("Copiato blocco di codice!", Toasts.Type.SUCCESS);
    };

    const formatTimestamp = () => {
        const unix = Math.floor(Date.now() / 1000);
        const res = `<t:${unix}:F> (<t:${unix}:R>)`;
        setOutput(res);
        navigator.clipboard.writeText(res);
        showToast("Copiato timestamp Discord!", Toasts.Type.SUCCESS);
    };

    const formatSpoiler = () => {
        const res = `||${input}||`;
        setOutput(res);
        navigator.clipboard.writeText(res);
        showToast("Copiato testo spoiler!", Toasts.Type.SUCCESS);
    };

    const formatQuote = () => {
        const res = input.split("\n").map(l => `> ${l}`).join("\n");
        setOutput(res);
        navigator.clipboard.writeText(res);
        showToast("Copiata citazione!", Toasts.Type.SUCCESS);
    };

    return (
        <Modal
            title="⚡ ClipboardFormatter — Formattatore Testo Discord"
            onClose={onClose}
            transitionState={1}
        >
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", minWidth: "440px" }}>
                <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>
                    Incolla il testo da formattare e clicca sull'azione desiderata (il risultato viene copiato subito negli appunti):
                </Text>
                <TextArea
                    value={input}
                    placeholder="Scrivi o incolla qui il testo..."
                    rows={4}
                    onChange={(val: string) => setInput(val)}
                />
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={() => formatCodeblock("ts")}>
                        {"</> Codeblock"}
                    </Button>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={formatTimestamp}>
                        ⏰ Timestamp Ora
                    </Button>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={formatSpoiler}>
                        🙈 Spoiler (||)
                    </Button>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.BRAND} onClick={formatQuote}>
                        ❝ Citazione (&gt;)
                    </Button>
                </div>
                {output && (
                    <div style={{ marginTop: "6px" }}>
                        <Text variant="text-xs/semibold" style={{ color: "var(--text-muted)", marginBottom: "4px" }}>
                            Risultato copiato:
                        </Text>
                        <div style={{
                            padding: "8px",
                            background: "var(--background-secondary)",
                            borderRadius: "4px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            wordBreak: "break-all"
                        }}>
                            {output}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default definePlugin({
    name: "ClipboardFormatter",
    description: "Formattatore rapido di appunti e testi in sintassi Discord (Timestamp dinamici, Blocchi di codice, Spoiler e Citazioni).",
    tags: ["Utility", "Chat"],
    authors: [Devs.Antigravity],

    toolboxActions: {
        "⚡ Formatta Testo Discord": () => {
            openModal(props => <FormatterModal onClose={props.onClose} />);
        }
    }
});
