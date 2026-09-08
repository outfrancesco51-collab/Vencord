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
            is_dm: { type: "boolean", description: "true se è un utente per aprire i DM" }
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
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send_message": {
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
          // Se riceviamo 404 Unknown Channel, l'IA potrebbe aver dimenticato is_dm: true
          // Tentiamo automaticamente di aprire un DM interpretando l'ID come ID Utente.
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
