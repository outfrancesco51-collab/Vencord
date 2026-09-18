/*
 * Vencord - OBSPlugin
 * Controlla OBS Studio direttamente da Discord via WebSocket
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { openModal, ModalContent, ModalHeader, ModalRoot } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, Text, TextInput, useState, useEffect, Menu } from "@webpack/common";

const settings = definePluginSettings({
    obsHost: {
        description: "Host OBS WebSocket (default: localhost)",
        type: OptionType.STRING,
        default: "localhost"
    },
    obsPort: {
        description: "Porta OBS WebSocket (default: 4455)",
        type: OptionType.STRING,
        default: "4455"
    },
    obsPassword: {
        description: "Password OBS WebSocket (lascia vuoto se non impostata)",
        type: OptionType.STRING,
        default: ""
    }
});

// OBS WebSocket Manager
class OBSWebSocketManager {
    private ws: WebSocket | null = null;
    private pendingRequests = new Map<string, (data: any) => void>();
    private connected = false;

    async connect(host: string, port: string, password: string): Promise<boolean> {
        return new Promise(resolve => {
            try {
                this.ws = new WebSocket(`ws://${host}:${port}`);

                this.ws.onmessage = async (event) => {
                    const msg = JSON.parse(event.data);

                    if (msg.op === 0) {
                        // Hello — send Identify
                        let auth = "";
                        if (password && msg.d.authentication) {
                            const { salt, challenge } = msg.d.authentication;
                            const encoder = new TextEncoder();
                            const secretRaw = await crypto.subtle.digest("SHA-256", encoder.encode(password + salt));
                            const secretB64 = btoa(String.fromCharCode(...new Uint8Array(secretRaw)));
                            const authRaw = await crypto.subtle.digest("SHA-256", encoder.encode(secretB64 + challenge));
                            auth = btoa(String.fromCharCode(...new Uint8Array(authRaw)));
                        }
                        this.ws!.send(JSON.stringify({
                            op: 1,
                            d: { rpcVersion: 1, ...(auth ? { authentication: auth } : {}) }
                        }));
                    } else if (msg.op === 2) {
                        // Identified
                        this.connected = true;
                        resolve(true);
                    } else if (msg.op === 7) {
                        // RequestResponse
                        const cb = this.pendingRequests.get(msg.d.requestId);
                        if (cb) {
                            cb(msg.d);
                            this.pendingRequests.delete(msg.d.requestId);
                        }
                    }
                };

                this.ws.onerror = () => resolve(false);
                this.ws.onclose = () => { this.connected = false; };

            } catch { resolve(false); }
        });
    }

    async request(type: string, data?: Record<string, any>): Promise<any> {
        if (!this.ws || !this.connected) throw new Error("OBS non connesso");
        const id = crypto.randomUUID();
        return new Promise(resolve => {
            this.pendingRequests.set(id, resolve);
            this.ws!.send(JSON.stringify({
                op: 6,
                d: { requestType: type, requestId: id, ...(data ? { requestData: data } : {}) }
            }));
        });
    }

    disconnect() {
        this.ws?.close();
        this.ws = null;
        this.connected = false;
    }

    isConnected() { return this.connected; }
}

const obsManager = new OBSWebSocketManager();

// OBS Control Panel Modal
function OBSControlPanel({ onClose }: { onClose: () => void; }) {
    const [connected, setConnected] = useState(false);
    const [status, setStatus] = useState("Disconnesso");
    const [scenes, setScenes] = useState<string[]>([]);
    const [currentScene, setCurrentScene] = useState("");
    const [recording, setRecording] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

    async function connect() {
        setStatus("Connessione...");
        const ok = await obsManager.connect(
            settings.store.obsHost,
            settings.store.obsPort,
            settings.store.obsPassword
        );
        if (ok) {
            setConnected(true);
            setStatus("✅ Connesso a OBS");
            addLog("Connessione stabilita");
            await refreshScenes();
            await refreshStatus();
        } else {
            setStatus("❌ Connessione fallita — Assicurati che OBS sia aperto con il WebSocket server attivo");
            addLog("Connessione fallita");
        }
    }

    async function refreshScenes() {
        const res = await obsManager.request("GetSceneList");
        const list = res.responseData?.scenes?.map((s: any) => s.sceneName) || [];
        setScenes(list);
        const cur = res.responseData?.currentProgramSceneName || "";
        setCurrentScene(cur);
    }

    async function refreshStatus() {
        const rec = await obsManager.request("GetRecordStatus");
        setRecording(rec.responseData?.outputActive || false);
        const stream = await obsManager.request("GetStreamStatus");
        setStreaming(stream.responseData?.outputActive || false);
    }

    async function switchScene(name: string) {
        await obsManager.request("SetCurrentProgramScene", { sceneName: name });
        setCurrentScene(name);
        addLog(`Scena cambiata: ${name}`);
    }

    async function toggleRecord() {
        if (recording) {
            await obsManager.request("StopRecord");
            setRecording(false);
            addLog("Registrazione fermata");
        } else {
            await obsManager.request("StartRecord");
            setRecording(true);
            addLog("Registrazione avviata");
        }
    }

    async function toggleStream() {
        if (streaming) {
            await obsManager.request("StopStream");
            setStreaming(false);
            addLog("Stream fermato");
        } else {
            await obsManager.request("StartStream");
            setStreaming(true);
            addLog("Stream avviato");
        }
    }

    async function saveReplay() {
        await obsManager.request("SaveReplayBuffer");
        addLog("Replay Buffer salvato!");
    }

    const btnStyle = (color: string) => ({
        padding: "8px 16px",
        background: color,
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "13px"
    } as React.CSSProperties);

    return (
        <ModalRoot size="large">
            <ModalHeader>
                <Text variant="heading-lg/bold">🎬 OBS Plugin — Pannello di Controllo</Text>
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Status & Connect */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "13px", color: connected ? "#57F287" : "#ED4245" }}>{status}</span>
                        {!connected && (
                            <button style={btnStyle("#5865F2")} onClick={connect}>Connetti OBS</button>
                        )}
                        {connected && (
                            <button style={btnStyle("#ED4245")} onClick={() => { obsManager.disconnect(); setConnected(false); setStatus("Disconnesso"); }}>Disconnetti</button>
                        )}
                    </div>

                    {connected && (
                        <>
                            {/* Recording & Streaming */}
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                <button style={btnStyle(recording ? "#ED4245" : "#57F287")} onClick={toggleRecord}>
                                    {recording ? "⏹ Ferma Registrazione" : "⏺ Avvia Registrazione"}
                                </button>
                                <button style={btnStyle(streaming ? "#ED4245" : "#FAA81A")} onClick={toggleStream}>
                                    {streaming ? "⏹ Ferma Stream" : "📡 Avvia Stream"}
                                </button>
                                <button style={btnStyle("#5865F2")} onClick={saveReplay}>💾 Salva Replay</button>
                                <button style={btnStyle("#4f545c")} onClick={refreshStatus}>🔄 Aggiorna Stato</button>
                            </div>

                            {/* Scene Switcher */}
                            {scenes.length > 0 && (
                                <div>
                                    <Text variant="text-sm/bold" style={{ marginBottom: "8px" }}>🎬 Scene</Text>
                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                        {scenes.map(scene => (
                                            <button
                                                key={scene}
                                                style={btnStyle(currentScene === scene ? "#57F287" : "#4f545c")}
                                                onClick={() => switchScene(scene)}
                                            >
                                                {currentScene === scene ? "▶ " : ""}{scene}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Log */}
                            <div style={{ background: "var(--background-tertiary)", borderRadius: "6px", padding: "8px", maxHeight: "150px", overflowY: "auto" }}>
                                <Text variant="text-xs/mono" style={{ color: "var(--text-muted)" }}>Log:</Text>
                                {log.map((entry, i) => (
                                    <div key={i}><Text variant="text-xs/mono" style={{ color: "var(--text-normal)" }}>{entry}</Text></div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

export default definePlugin({
    name: "OBSPlugin",
    description: "🎬 Controlla OBS Studio direttamente da Discord: cambia scene, avvia/ferma registrazione, stream, replay buffer — tutto integrato nel client Discord.",
    tags: ["OBS", "Streaming", "Recording"],
    authors: [{ name: "Antigravity", id: 0n }],
    settings,

    toolbarActions: [
        {
            id: "obs-control",
            label: "🎬 OBS Control",
            icon: () => (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="#CC0000" opacity="0.9" />
                    <circle cx="12" cy="12" r="5" fill="white" />
                </svg>
            ),
            action: () => {
                openModal(props => <OBSControlPanel onClose={props.onClose} />);
            }
        }
    ],

    contextMenus: {
        "guild-context": (children) => {
            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id="obs-open-panel"
                    label="🎬 OBS Plugin — Pannello"
                    action={() => openModal(props => <OBSControlPanel onClose={props.onClose} />)}
                />
            );
        }
    },

    start() {
        console.log("[OBSPlugin] Avviato. Configura host/porta/password nelle impostazioni.");
    },

    stop() {
        obsManager.disconnect();
    }
});
