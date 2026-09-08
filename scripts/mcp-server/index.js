const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const server = new Server(
  {
    name: "discord-mcp-advanced",
    version: "2.0.0",
  },
  { capabilities: { tools: {}, prompts: {} } }
);

// Helper for Real Discord API requests
async function discordApiRequest(endpoint, method, body, reason) {
  let token = process.env.DISCORD_MCP_TOKEN;
  // If the user runs directly without modifying, we fallback to reading unsloth_mcp.json directly just in case.
  if (!token || token.includes("IL_TUO_TOKEN_BOT_QUI")) {
    try {
        const unslothConf = require("../../mcp_configs/unsloth_mcp.json");
        token = unslothConf.mcpServers["discord-mcp"].env.DISCORD_MCP_TOKEN;
    } catch(e) {}
  }
  
  if (!token || token.includes("IL_TUO_TOKEN_BOT_QUI")) {
    throw new Error("Manca il token di Discord VERO! Imposta DISCORD_MCP_TOKEN nel file unsloth_mcp.json. Attualmente hai ancora il placeholder di default, quindi l'API (401 Unauthorized) ti respinge.");
  }
  
  let authString = token;
  if (!token.startsWith("Bot ") && !token.startsWith("Bearer ") && token.length > 50) {
     authString = `Bot ${token}`;
  }

  const headers = {
    "Authorization": authString,
    "Content-Type": "application/json",
  };
  if (reason) headers["X-Audit-Log-Reason"] = encodeURIComponent(reason);

  let res = await fetch(`https://discord.com/api/v10${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API Error: ${res.status} ${err}. (Se ricevi 401 Unauthorized significa che il token in unsloth_mcp.json è sbagliato, invalido o mancante)`);
  }
  
  return res.status === 204 ? null : await res.json();
}

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "moderazione_automatica",
        description: "Prompt per eseguire la catena di moderazione automatica",
        arguments: []
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "moderazione_automatica") {
    return {
      description: "Prompt per eseguire la moderazione",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Usa il tool view_channel_current_bot_isin con channel_id 1431795901353169027 per controllare dove ti trovi. Dopo aver confermato, usa isolate_and_timeout_user inserendo SOLO l'ID del canale (e l'ID utente 1255608249735184395). Farà tutto lui in automatico: ti toglierà i ruoli, ti sposterà ed emetterà il timeout!"
          }
        }
      ]
    };
  }
  throw new Error("Prompt not found");
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send_message",
        description: "Invia un messaggio REALE a un canale Discord o in DM",
        inputSchema: {
          type: "object",
          properties: {
            channel_or_user_id: { type: "string", description: "ID canale o utente" },
            content: { type: "string" },
            is_dm: { type: "boolean", description: "true se è un utente per aprire i DM" },
            guild_id: { type: "string", description: "ID del server (richiesto per auto-timeout su parolacce)" },
            author_id: { type: "string", description: "ID dell'utente che ha generato il comando (richiesto per auto-timeout)" }
          },
          required: ["channel_or_user_id", "content"],
        },
      },
      {
        name: "timeout_user",
        description: "Metti in timeout un utente Discord",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
            duration_minutes: { type: "number" },
            reason: { type: "string" },
          },
          required: ["guild_id", "user_id", "duration_minutes"],
        },
      },
      {
        name: "move_to_voice_channel",
        description: "Sposta o unisce un utente a un canale vocale (tramite ID)",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
            channel_id: { type: "string" },
          },
          required: ["guild_id", "user_id", "channel_id"],
        },
      },
      {
        name: "kick_user",
        description: "Espelle (kick) un utente dal server",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
          },
          required: ["guild_id", "user_id"],
        },
      },
      {
        name: "ban_user",
        description: "Banna un utente dal server",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
            delete_message_seconds: { type: "number", description: "Secondi di cronologia messaggi da eliminare (es. 86400 per 1 giorno)" }
          },
          required: ["guild_id", "user_id"],
        },
      },
      {
        name: "isolate_and_timeout_user",
        description: "Rimuove tutti i ruoli, sposta in un canale specifico e mette in timeout, risolvendo il server in automatico",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "Default: 1255608249735184395" },
            channel_id: { type: "string", description: "Default: 1431795901353169027" },
            duration_minutes: { type: "number", description: "Default: 1" }
          },
          required: ["channel_id"],
        },
      },
      {
        name: "view_channel_current_bot_isin",
        description: "Mostra le informazioni su un canale (in quale server si trova il bot/utente in quel momento)",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "ID del canale da ispezionare" }
          },
          required: ["channel_id"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send_message": {
        const badWords = ["cazzo", "stick", "ma tua madre", "negrooo", "kaizune facciamo sesso"];
        const lowerContent = args.content.toLowerCase();
        let detectedBadWord = null;
        for (const word of badWords) {
          if (lowerContent.includes(word)) {
            detectedBadWord = word;
            break;
          }
        }

        if (detectedBadWord) {
            if (args.guild_id && args.author_id) {
                 const timeoutUntil = new Date(Date.now() + 10 * 60000).toISOString();
                 await discordApiRequest(`/guilds/${args.guild_id}/members/${args.author_id}`, "PATCH", {
                    communication_disabled_until: timeoutUntil
                 }).catch(e => console.error("Impossibile mettere in timeout l'utente per parolacce", e));
                 return { content: [{ type: "text", text: `Errore: Il messaggio contiene una parola bloccata ("${detectedBadWord}"). L'utente è stato messo in timeout per 10 minuti automaticamente.` }], isError: true };
            }
            return { content: [{ type: "text", text: `Errore: Il messaggio contiene una parola bloccata ("${detectedBadWord}"). Impossibile inviare.` }], isError: true };
        }
        
        let targetChannelId = args.channel_or_user_id;
        
        if (args.is_dm) {
          const dmChannel = await discordApiRequest("/users/@me/channels", "POST", {
            recipient_id: args.channel_or_user_id
          });
          targetChannelId = dmChannel.id;
        }

        let msg;
        try {
          msg = await discordApiRequest(`/channels/${targetChannelId}/messages`, "POST", {
            content: args.content
          });
        } catch (err) {
          if (err.message.includes("404") || err.message.includes("10003")) {
            console.error("Canale non trovato, tento di aprirlo come DM Utente...");
            const dmChannel = await discordApiRequest("/users/@me/channels", "POST", {
              recipient_id: args.channel_or_user_id
            });
            msg = await discordApiRequest(`/channels/${dmChannel.id}/messages`, "POST", {
              content: args.content
            });
          } else {
            throw err;
          }
        }

        return { content: [{ type: "text", text: `Messaggio REALE inviato! ID Messaggio: ${msg.id}` }] };
      }
      
      case "timeout_user": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        if (!guildId) throw new Error("Manca guild_id o channel_id per dedurre il server.");
        
        if (args.send_dm) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: `Sei stato messo in timeout in ${guildId}. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        const timeoutUntil = new Date(Date.now() + args.duration_minutes * 60000).toISOString();
        await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", {
          communication_disabled_until: timeoutUntil
        }, args.reason);
        return { content: [{ type: "text", text: `Utente ${args.user_id} in timeout per ${args.duration_minutes}m.` }] };
      }
      
      case "move_to_voice_channel": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", {
          channel_id: args.channel_id
        });
        return { content: [{ type: "text", text: `Utente ${args.user_id} spostato nel canale vocale ${args.channel_id}.` }] };
      }

      case "kick_user": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        if (!guildId) throw new Error("Manca guild_id o channel_id.");

        if (args.send_dm) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: `Sei stato espulso (kick) da ${guildId}. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "DELETE", null, args.reason);
        return { content: [{ type: "text", text: `Utente ${args.user_id} espulso (kick) con successo dal server.` }] };
      }

      case "ban_user": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        if (!guildId) throw new Error("Manca guild_id o channel_id.");

        if (args.send_dm) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: `Sei stato bannato da ${guildId}. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        await discordApiRequest(`/guilds/${guildId}/bans/${args.user_id}`, "PUT", {
            delete_message_seconds: args.delete_message_seconds || 0
        }, args.reason);
        return { content: [{ type: "text", text: `Utente ${args.user_id} bannato con successo dal server.` }] };
      }

      case "isolate_and_timeout_user": {
        const userId = args.user_id || "1255608249735184395";
        const channelId = args.channel_id || "1431795901353169027";
        const duration = args.duration_minutes || 1;
        
        // Fase 0: Risolvi il guild_id tramite il channelId
        const channelData = await discordApiRequest(`/channels/${channelId}`, "GET");
        const guildId = channelData.guild_id;
        if (!guildId) {
            throw new Error("Impossibile trovare il server_id per questo canale. Forse è un canale DM?");
        }

        let errors = [];

        // Fase 1: Rimuovi i ruoli (strip all roles)
        try {
            await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "PATCH", { roles: [] });
        } catch (e) {
            errors.push("Rimuovi Ruoli Fallito: " + e.message);
        }

        // Fase 2: Sposta nel canale vocale
        try {
            await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "PATCH", { channel_id: channelId });
        } catch (e) {
            errors.push("Spostamento Vocale Fallito: " + e.message);
        }

        // Fase 3: Pausa di 10 secondi e poi Timeout
        await new Promise(resolve => setTimeout(resolve, 10000));
        const timeoutUntil = new Date(Date.now() + duration * 60000).toISOString();
        try {
            await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "PATCH", { communication_disabled_until: timeoutUntil });
        } catch (e) {
            errors.push("Timeout Fallito: " + e.message);
        }

        if (errors.length > 0) {
            throw new Error("Discord API ha rifiutato l'azione! Controlla i permessi del bot e assicurati di NON essere l'Owner del Server (i bot non possono moderare gli owner o i ruoli superiori). Dettagli errori:\n" + errors.join("\n"));
        }

        return { content: [{ type: "text", text: `Successo! Server ID [${guildId}] risolto automaticamente dal canale. L'utente ${userId} è stato spogliato dei ruoli, spostato nel canale ${channelId}, abbiamo atteso 10 secondi e infine è stato messo in timeout per ${duration} minuto/i.` }] };
      }

      case "view_channel_current_bot_isin": {
        const channelData = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
        const guildId = channelData.guild_id;
        return { content: [{ type: "text", text: `Informazioni Canale:\nID Canale: ${channelData.id}\nNome Canale: ${channelData.name}\nTipo: ${channelData.type}\nServer ID (Guild): ${guildId || "Nessuno (DM)"}` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Errore durante il tool: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
