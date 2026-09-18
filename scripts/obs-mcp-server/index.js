#!/usr/bin/env node
/*
 * OBS MCP Server — 24 tools per controllare OBS Studio via WebSocket
 * Compatibile con Unsloth e modelli locali
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import crypto from "crypto";
import WebSocket from "ws";

const server = new McpServer({
    name: "obs-discord-mcp",
    version: "1.0.0"
});

// OBS WebSocket State
let ws = null;
let connected = false;
const pending = new Map();

const OBS_HOST = process.env.OBS_HOST || "localhost";
const OBS_PORT = process.env.OBS_PORT || "4455";
const OBS_PASSWORD = process.env.OBS_PASSWORD || "";

function calcAuth(password, salt, challenge) {
    const secret = crypto.createHash("sha256").update(password + salt).digest("base64");
    return crypto.createHash("sha256").update(secret + challenge).digest("base64");
}

async function connectOBS() {
    return new Promise((resolve) => {
        ws = new WebSocket(`ws://${OBS_HOST}:${OBS_PORT}`);
        ws.on("message", async (raw) => {
            const msg = JSON.parse(raw.toString());
            if (msg.op === 0) {
                const identify = { op: 1, d: { rpcVersion: 1 } };
                if (OBS_PASSWORD && msg.d.authentication) {
                    identify.d.authentication = calcAuth(OBS_PASSWORD, msg.d.authentication.salt, msg.d.authentication.challenge);
                }
                ws.send(JSON.stringify(identify));
            } else if (msg.op === 2) {
                connected = true;
                resolve(true);
            } else if (msg.op === 7) {
                const cb = pending.get(msg.d.requestId);
                if (cb) { cb(msg.d); pending.delete(msg.d.requestId); }
            }
        });
        ws.on("error", () => resolve(false));
        ws.on("close", () => { connected = false; });
    });
}

async function obsReq(type, data = {}) {
    if (!connected) await connectOBS();
    if (!connected) throw new Error("Impossibile connettersi a OBS. Assicurati che OBS sia aperto con WebSocket server attivo.");
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
        pending.set(id, resolve);
        ws.send(JSON.stringify({ op: 6, d: { requestType: type, requestId: id, ...(Object.keys(data).length ? { requestData: data } : {}) } }));
        setTimeout(() => reject(new Error(`Timeout per ${type}`)), 10000);
    });
}

function txt(text) { return { content: [{ type: "text", text }] }; }
function ok(data) { return txt("✅ " + JSON.stringify(data?.responseData ?? data?.requestStatus ?? data, null, 2)); }

// ─── 24 TOOLS ───────────────────────────────────────────────────────────────

server.tool("obs_get_version", "Ottieni versione di OBS e obs-websocket", {}, async () => ok(await obsReq("GetVersion")));

server.tool("obs_get_stats", "Statistiche OBS: CPU, RAM, FPS, latenza", {}, async () => ok(await obsReq("GetStats")));

server.tool("obs_get_scene_list", "Lista completa delle scene in OBS", {}, async () => ok(await obsReq("GetSceneList")));

server.tool("obs_set_scene", "Cambia la scena attiva", { scene_name: z.string().describe("Nome della scena") }, async ({ scene_name }) => ok(await obsReq("SetCurrentProgramScene", { sceneName: scene_name })));

server.tool("obs_get_current_scene", "Scena attualmente attiva in Program", {}, async () => ok(await obsReq("GetCurrentProgramScene")));

server.tool("obs_start_record", "Avvia la registrazione in OBS", {}, async () => ok(await obsReq("StartRecord")));

server.tool("obs_stop_record", "Ferma la registrazione e restituisce il path del file", {}, async () => ok(await obsReq("StopRecord")));

server.tool("obs_pause_record", "Mette in pausa la registrazione", {}, async () => ok(await obsReq("PauseRecord")));

server.tool("obs_resume_record", "Riprende la registrazione dopo la pausa", {}, async () => ok(await obsReq("ResumeRecord")));

server.tool("obs_get_record_status", "Stato della registrazione: attiva/in pausa/tempo trascorso", {}, async () => ok(await obsReq("GetRecordStatus")));

server.tool("obs_start_stream", "Avvia lo streaming in OBS", {}, async () => ok(await obsReq("StartStream")));

server.tool("obs_stop_stream", "Ferma lo streaming in OBS", {}, async () => ok(await obsReq("StopStream")));

server.tool("obs_get_stream_status", "Stato dello stream: attivo/byte inviati/tempo", {}, async () => ok(await obsReq("GetStreamStatus")));

server.tool("obs_start_virtual_cam", "Avvia la Virtual Camera di OBS", {}, async () => ok(await obsReq("StartVirtualCam")));

server.tool("obs_stop_virtual_cam", "Ferma la Virtual Camera di OBS", {}, async () => ok(await obsReq("StopVirtualCam")));

server.tool("obs_start_replay_buffer", "Avvia il Replay Buffer", {}, async () => ok(await obsReq("StartReplayBuffer")));

server.tool("obs_save_replay_buffer", "Salva immediatamente il Replay Buffer come clip", {}, async () => ok(await obsReq("SaveReplayBuffer")));

server.tool("obs_get_input_volume", "Ottieni volume di una sorgente audio", { input_name: z.string().describe("Nome della sorgente (es: Mic/Aux, Desktop Audio)") }, async ({ input_name }) => ok(await obsReq("GetInputVolume", { inputName: input_name })));

server.tool("obs_set_input_volume", "Imposta il volume di una sorgente in dB", { input_name: z.string().describe("Nome sorgente"), volume_db: z.number().describe("Volume in dB (es: -10 per -10dB, 0 per volume pieno)") }, async ({ input_name, volume_db }) => ok(await obsReq("SetInputVolume", { inputName: input_name, inputVolumeDb: volume_db })));

server.tool("obs_toggle_mute", "Toggle muto di una sorgente audio", { input_name: z.string().describe("Nome sorgente (es: Mic/Aux)") }, async ({ input_name }) => ok(await obsReq("ToggleInputMute", { inputName: input_name })));

server.tool("obs_get_filter_list", "Lista dei filtri applicati a una sorgente", { source_name: z.string().describe("Nome sorgente") }, async ({ source_name }) => ok(await obsReq("GetSourceFilterList", { sourceName: source_name })));

server.tool("obs_toggle_filter", "Abilita o disabilita un filtro su una sorgente", { source_name: z.string(), filter_name: z.string(), enabled: z.boolean() }, async ({ source_name, filter_name, enabled }) => ok(await obsReq("SetSourceFilterEnabled", { sourceName: source_name, filterName: filter_name, filterEnabled: enabled })));

server.tool("obs_get_studio_mode", "Controlla se lo Studio Mode è attivo", {}, async () => ok(await obsReq("GetStudioModeEnabled")));

server.tool("obs_set_scene_transition", "Imposta la transizione e durata (ms) tra scene",
    { transition_name: z.string().describe("Nome transizione (es: Fade, Cut)"), duration_ms: z.number().optional().describe("Durata in millisecondi") },
    async ({ transition_name, duration_ms }) => {
        await obsReq("SetCurrentSceneTransition", { transitionName: transition_name });
        if (duration_ms) await obsReq("SetCurrentSceneTransitionDuration", { transitionDuration: duration_ms });
        return txt(`✅ Transizione impostata: ${transition_name}${duration_ms ? ` (${duration_ms}ms)` : ""}`);
    }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
