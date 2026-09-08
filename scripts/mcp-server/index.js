const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const server = new Server(
  {
    name: "discord-mcp-advanced",
    version: "2.0.0",
  },
  { capabilities: { tools: {} } }
);

// Helper for Real Discord API requests
async function discordApiRequest(endpoint, method, body) {
  let token = process.env.DISCORD_MCP_TOKEN;
  if (!token || token === "INSERISCI_QUI_IL_TUO_TOKEN" || token === "YOUR_DISCORD_TOKEN_HERE") {
    throw new Error("Manca il token di Discord! Imposta DISCORD_MCP_TOKEN nel JSON.");
  }
  
  if (!token.startsWith("Bot ") && !token.startsWith("Bearer ") && token.length > 50) {
     // Aggiungiamo 'Bot ' in modo intelligente se fallisce il primo tentativo
  }

  let res = await fetch(`https://discord.com/api/v10${endpoint}`, {
    method,
    headers: {
      "Authorization": token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !token.startsWith("Bot ")) {
    res = await fetch(`https://discord.com/api/v10${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API Error: ${res.status} ${err}`);
  }
  
  return res.status === 204 ? null : await res.json();
}

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
        const timeoutUntil = new Date(Date.now() + args.duration_minutes * 60000).toISOString();
        await discordApiRequest(`/guilds/${args.guild_id}/members/${args.user_id}`, "PATCH", {
          communication_disabled_until: timeoutUntil
        });
        return { content: [{ type: "text", text: `Utente ${args.user_id} in timeout per ${args.duration_minutes}m.` }] };
      }
      
      case "move_to_voice_channel": {
        await discordApiRequest(`/guilds/${args.guild_id}/members/${args.user_id}`, "PATCH", {
          channel_id: args.channel_id
        });
        return { content: [{ type: "text", text: `Utente ${args.user_id} spostato nel canale vocale ${args.channel_id}.` }] };
      }

      case "kick_user": {
        await discordApiRequest(`/guilds/${args.guild_id}/members/${args.user_id}`, "DELETE");
        return { content: [{ type: "text", text: `Utente ${args.user_id} espulso (kick) con successo dal server.` }] };
      }

      case "ban_user": {
        await discordApiRequest(`/guilds/${args.guild_id}/bans/${args.user_id}`, "PUT", {
            delete_message_seconds: args.delete_message_seconds || 0
        });
        return { content: [{ type: "text", text: `Utente ${args.user_id} bannato con successo dal server.` }] };
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
