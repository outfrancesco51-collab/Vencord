# Guida all'uso del Server MCP per Discord (Node.js)

Questa guida ti spiegherà passo dopo passo come configurare e far comunicare i vari client AI (Unsloth Studio, Claude Desktop, Cursor, ecc.) con il nostro Server MCP personalizzato.

---

## 1. I File JSON di Configurazione

Nella cartella `mcp_configs/` troverai vari file `.json` generati per i diversi client:
- `unsloth_mcp.json`
- `antigravity_mcp.json`
- `ide_mcp.json`

Ognuno di questi file ha un blocco `env` contenente le Variabili d'Ambiente necessarie. **Devi modificare il file che intendi usare prima di importarlo.**

### Esempio del blocco ENV:
```json
"env": {
  "DISCORD_MCP_TOKEN": "INSERISCI_QUI_IL_TUO_TOKEN",
  "UNSLOTH_API_KEY": "OPZIONALE_INSERISCI_LA_CHIAVE_QUI",
  "ALLOWED_TOOLS": "read_chat,generate_image,generate_code,upload_swisstransfer,manage_channels"
}
```

---

## 2. Come ottenere e inserire le chiavi

### `DISCORD_MCP_TOKEN`
Questo è il token di autorizzazione che permette al server MCP di comunicare a nome del tuo account o del tuo bot. 

> ⚠️ **ATTENZIONE:** Utilizzare un "User Token" (il token del tuo profilo personale) per script automatizzati è tecnicamente contro i Termini di Servizio (ToS) di Discord. Usa questa funzione a tuo rischio e pericolo, o preferibilmente usa il Token di un **Bot Discord Ufficiale**.

- **Se usi un Bot:** Vai sul [Discord Developer Portal](https://discord.com/developers/applications), seleziona la tua app, vai nella scheda "Bot", e clicca "Reset Token" per ottenerlo. **Importante:** Se usi un token Bot, dovrai prefiggerlo con `Bot ` nel file index.js, o scriverlo per esteso se lo script lo gestisce. Attualmente lo script Node usa la stringa esatta che inserisci qui. Nel caso di un bot scrivi: `"Bot IL_TUO_TOKEN"`. Nel caso di un utente, solo il token.
- **Se usi un Account Utente (Solo per test locali):** Il token può essere solitamente estratto dalla scheda "Rete" (Network) degli strumenti per sviluppatori del browser (F12) su Discord Web, cercando la voce `Authorization` negli header delle richieste. Inserisci quella stringa direttamente.

### Altre API Key (`UNSLOTH_API_KEY`, `IDE_API_KEY`, ecc.)
- Se stai collegando un'interfaccia o un LLM che necessita di autenticazione remota, sostituisci il testo segnaposto con la tua vera API Key (ad es. di OpenAI, Claude, o le credenziali della tua dashboard di Unsloth/Antigravity). Se l'LLM è eseguito in locale, potresti non averne affatto bisogno e puoi lasciare un valore vuoto.

---

## 3. Utilizzo e Importazione (Unsloth Studio / Cursor / Claude)

1. Apri il tuo programma AI (es. Unsloth Studio o Claude Desktop).
2. Vai nelle impostazioni e cerca **"MCP Servers"** o **"Add Server"**.
3. Clicca su **"Import Config"** e seleziona il file `.json` che hai appena modificato (es. `unsloth_mcp.json`).
4. Il programma leggerà il campo `"command"` (che lancia `node`) e capirà come avviare in backgroud il nostro server `scripts/mcp-server/index.js`.
5. Ora, prova a inviare all'IA un prompt come questo:
   > *"Invia un messaggio di prova all'utente con ID 877198117869584406 usando il tuo tool MCP."*

---

## 4. Panoramica dei Tool Disponibili

L'IA vedrà a sua disposizione questi strumenti (grazie al server MCP in Node):
- `send_message`: per inoltrare un messaggio. È sufficiente specificare `is_dm: true` per avviare una chat in DM.
- `timeout_user`: per mettere in timeout utenti fastidiosi (necessita dell'ID del Server, dell'utente, durata in minuti e un motivo).
- `generate_code` & `generate_image`: utili per estendere Antigravity/Codex e caricare zip di grosse dimensioni tramite proxy (come SwissTransfer).
