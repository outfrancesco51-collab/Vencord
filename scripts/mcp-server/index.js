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
        name: "create_channel",
        description: "Crea un singolo canale (Testuale, Vocale o Categoria) in un server Discord",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            name: { type: "string" },
            type: { type: "number", description: "0 = Testuale, 2 = Vocale, 4 = Categoria" },
            parent_id: { type: "string", description: "ID della Categoria se vuoi metterlo dentro una categoria" }
          },
          required: ["guild_id", "name", "type"],
        }
      },
      {
        name: "create_channels_bulk",
        description: "Crea una struttura completa di canali e categorie in massa (utilissimo per template come server RP FiveM). Invia un array JSON di categorie e canali.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            structure_json: { type: "string", description: "JSON formattato come: [{\"categoryName\":\"ACCOGLIENZA\", \"channels\":[{\"name\":\"benvenuto\",\"type\":0}, {\"name\":\"attesa\",\"type\":2}]}]" }
          },
          required: ["guild_id", "structure_json"],
        }
      },
      {
        name: "delete_channel",
        description: "Elimina un canale o una categoria specificata",
        inputSchema: {
          type: "object",
          properties: { channel_id: { type: "string" } },
          required: ["channel_id"]
        }
      },
      {
        name: "create_role",
        description: "Crea un nuovo ruolo nel server",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            name: { type: "string" },
            color: { type: "number", description: "Colore intero (es. 16711680 per rosso)" },
            permissions: { type: "string", description: "Permessi (es. '0' per base)" }
          },
          required: ["guild_id", "name"]
        }
      },
      {
        name: "delete_role",
        description: "Elimina un ruolo dal server",
        inputSchema: {
          type: "object",
          properties: { guild_id: { type: "string" }, role_id: { type: "string" } },
          required: ["guild_id", "role_id"]
        }
      },
      {
        name: "assign_role",
        description: "Assegna un ruolo a un utente",
        inputSchema: {
          type: "object",
          properties: { guild_id: { type: "string" }, user_id: { type: "string" }, role_id: { type: "string" } },
          required: ["guild_id", "user_id", "role_id"]
        }
      },
      {
        name: "rename_channel",
        description: "Rinomina un canale esistente",
        inputSchema: {
          type: "object",
          properties: { channel_id: { type: "string" }, new_name: { type: "string" } },
          required: ["channel_id", "new_name"]
        }
      },
      {
        name: "change_nickname",
        description: "Cambia il nickname di un utente nel server",
        inputSchema: {
          type: "object",
          properties: { guild_id: { type: "string" }, user_id: { type: "string" }, new_nickname: { type: "string" } },
          required: ["guild_id", "user_id", "new_nickname"]
        }
      },
      {
        name: "lock_channel",
        description: "Blocca un canale per gli utenti standard (toglie permesso SEND_MESSAGES all'everyone)",
        inputSchema: {
          type: "object",
          properties: { guild_id: { type: "string" }, channel_id: { type: "string" } },
          required: ["guild_id", "channel_id"]
        }
      },
      {
        name: "unlock_channel",
        description: "Sblocca un canale precedentemente bloccato",
        inputSchema: {
          type: "object",
          properties: { guild_id: { type: "string" }, channel_id: { type: "string" } },
          required: ["guild_id", "channel_id"]
        }
      },
      {
        name: "purge_messages",
        description: "Cancella fino a 100 messaggi in un canale testuale in un colpo",
        inputSchema: {
          type: "object",
          properties: { channel_id: { type: "string" }, amount: { type: "number", description: "Numero messaggi (max 100)" } },
          required: ["channel_id", "amount"]
        }
      },
      {
        name: "pin_message",
        description: "Fissa (pin) un messaggio nel canale",
        inputSchema: {
          type: "object",
          properties: { channel_id: { type: "string" }, message_id: { type: "string" } },
          required: ["channel_id", "message_id"]
        }
      },
      {
        name: "unpin_message",
        description: "Rimuove il pin di un messaggio",
        inputSchema: {
          type: "object",
          properties: { channel_id: { type: "string" }, message_id: { type: "string" } },
          required: ["channel_id", "message_id"]
        }
      },
      {
        name: "set_slowmode",
        description: "Imposta lo slowmode in un canale testuale",
        inputSchema: {
          type: "object",
          properties: { channel_id: { type: "string" }, seconds: { type: "number" } },
          required: ["channel_id", "seconds"]
        }
      },
      {
        name: "get_server_info",
        description: "Ottiene le informazioni avanzate del server (numero membri, categorie, ruoli ecc)",
        inputSchema: {
          type: "object",
          properties: { guild_id: { type: "string" } },
          required: ["guild_id"]
        }
      },
      {
        name: "create_invite",
        description: "Crea un link di invito per il canale",
        inputSchema: {
          type: "object",
          properties: { channel_id: { type: "string" } },
          required: ["channel_id"]
        }
      },
      {
        name: "remove_role",
        description: "Rimuove un ruolo specifico da un utente",
        inputSchema: {
          type: "object",
          properties: { guild_id: { type: "string" }, user_id: { type: "string" }, role_id: { type: "string" } },
          required: ["guild_id", "user_id", "role_id"]
        }
      },

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
            duration_minutes: { type: "number", description: "Imposta 0 per rimuovere il timeout" },
            reason: { type: "string" },
            modo_pesante: { type: "boolean", description: "Moltiplica la durata e agisce in modo pesante" }
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
        description: "Espelle (kick) un utente dal server. Può agire 'in modo pesante' rimuovendo prima tutti i ruoli, inviando un DM e rinominando l'utente.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
            modo_pesante: { type: "boolean", description: "Se true, agisce in modo pesantissimo prima del kick (rimuove ruoli, spam, umiliazione)" }
          },
          required: ["guild_id", "user_id"],
        },
      },
      {
        name: "delayed_moderation_action",
        description: "Esegue un kick, ban o timeout ritardato su un utente",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
            action: { type: "string", enum: ["kick", "ban", "timeout"], description: "Azione da compiere (kick, ban, timeout)" },
            delay_seconds: { type: "number", description: "Quanti secondi attendere prima dell'azione" }
          },
          required: ["guild_id", "user_id", "action", "delay_seconds"],
        },
      },
      {
        name: "show_current_roles_channel",
        description: "Mostra tutti gli ID degli utenti presenti in un canale vocale con i loro ruoli attuali.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            channel_id: { type: "string" }
          },
          required: ["guild_id", "channel_id"],
        },
      },
      {
        name: "remove_all_roles",
        description: "Rimuove tutti i ruoli da un utente (anche specificato tramite un canale in cui si trova), tranne gli ID ruoli da ignorare.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Opzionale se deduci dal canale" },
            channel_id: { type: "string", description: "Opzionale per dedurre la guild e l'utente se non passi l'ID utente diretto" },
            user_id: { type: "string" },
            ignore_roles: { type: "array", items: { type: "string" }, description: "Array di ID ruolo da NON rimuovere" }
          },
          required: ["user_id", "ignore_roles"],
        },
      },
      {
        name: "ban_user",
        description: "Banna un utente dal server. Può agire 'in modo pesante' spazzando via messaggi e umiliando prima del ban.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
            delete_message_seconds: { type: "number", description: "Secondi di cronologia messaggi da eliminare (es. 86400 per 1 giorno)" },
            modo_pesante: { type: "boolean", description: "Se true, distrugge completamente l'utente e cancella 7 giorni di messaggi (massimo consentito)" }
          },
          required: ["guild_id", "user_id"],
        },
      },
      {
        name: "mute_deafen_user",
        description: "Applica o rimuove il Silenziamento nel Server (mute) e/o il Silenzia Server (deafen) a un utente connesso in vocale.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string" },
            user_id: { type: "string" },
            mute: { type: "boolean", description: "true per mutare (Silenziamento nel server), false per smutarlo" },
            deaf: { type: "boolean", description: "true per assordare (Silenzia server), false per riattivare l'audio" }
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
      },
      {
        name: "search_image",
        description: "Cerca un'immagine su internet e restituisce un link Markdown pronto da inviare in chat",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Es: Luigi's Mansion 3" }
          },
          required: ["query"],
        },
      },
      {
        name: "automatize_channel",
        description: "Strumento IA Avanzato per analizzare e automatizzare un Server/Canale. AZIONI: usa 'analyze' per LEGGERE i canali/ruoli attuali del server; usa 'execute' per CREARE in automatico nuove sezioni, canali, ruoli, webhook e script di scraping basandosi su ciò che l'IA ha deciso.",
        inputSchema: {
          type: "object",
          properties: {
            target_id: { type: "string", description: "ID del Server (Guild) o del Canale. Se l'utente ti dà un ID, mettilo qui." },
            action: { type: "string", enum: ["analyze", "execute"], description: "Passo 1: 'analyze' (restituisce canali/ruoli attuali). Passo 2: 'execute' (crea le modifiche)" },
            topic: { type: "string", description: "Es: Luigi's Mansion News (richiesto solo per execute)" },
            new_categories: { type: "array", items: { type: "string" }, description: "Nomi delle nuove Categorie/Sezioni da creare (solo per execute)" },
            new_channels: { type: "array", items: { type: "string" }, description: "Nomi dei nuovi Canali testuali da creare (solo per execute)" },
            new_roles: { type: "array", items: { type: "string" }, description: "Nomi dei nuovi Ruoli da creare (solo per execute)" }
          },
          required: ["target_id", "action"],
        },
      },
      {
        name: "play_music",
        description: "Fa entrare il bot in un canale vocale e riproduce l'audio da un link YouTube (es. se l'utente ti chiede di mettere musica).",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Opzionale. Se non fornito, viene dedotto dal canale." },
            channel_id: { type: "string", description: "L'ID del canale vocale in cui entrare" },
            url: { type: "string", description: "Il link al video di YouTube o la traccia" }
          },
          required: ["channel_id", "url"],
        },
      },
      {
        name: "search_user_information",
        description: "Effettua una ricerca OSINT in stile Sherlock per trovare se un username esiste su vari social network e siti web (GitHub, Reddit, Steam, YouTube, ecc).",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "L'username da cercare" }
          },
          required: ["username"],
        },
      },
      {
        name: "webcam_image",
        description: "Accende la 'webcam' in un canale vocale, trasmettendo un'immagine fissa al posto del video reale (Fake Camera streaming).",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "L'ID del canale vocale" },
            image_url: { type: "string", description: "L'URL o il percorso dell'immagine da mostrare" }
          },
          required: ["channel_id", "image_url"],
        },
      },
      {
        name: "auto_message",
        description: "Genera e avvia un bot autonomo che 'ascolta' i messaggi di un utente specifico in un canale e usa l'intelligenza artificiale (Unsloth locale) per generare risposte automatiche.",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "L'ID del canale testuale dove il bot ascolterà" },
            target_user_id: { type: "string", description: "L'ID dell'utente da ascoltare (se null, risponde a tutti)" },
            system_prompt: { type: "string", description: "Il prompt di sistema che dice all'IA come comportarsi e rispondere (es. 'Sei un assistente sarcastico')" },
            unsloth_api_url: { type: "string", description: "L'endpoint API locale di Unsloth (es. http://127.0.0.1:8080/v1/chat/completions)" }
          },
          required: ["channel_id", "system_prompt", "unsloth_api_url"],
        },
      }
    ],
  };
});

async function verifyModeration(guildId, targetUserId) {
    try {
        const me = await discordApiRequest("/users/@me", "GET");
        const botId = me.id;
        
        const [botMember, targetMember, allRoles, guild] = await Promise.all([
            discordApiRequest(`/guilds/${guildId}/members/${botId}`, "GET"),
            discordApiRequest(`/guilds/${guildId}/members/${targetUserId}`, "GET").catch(() => null), // Può fallire se l'utente non è nel server
            discordApiRequest(`/guilds/${guildId}/roles`, "GET"),
            discordApiRequest(`/guilds/${guildId}`, "GET")
        ]);
        
        if (!targetMember) return; // Se l'utente non è nel server (es. ban via ID), non possiamo controllare i ruoli.

        const getHighestRolePos = (memberRoles) => {
            let highest = 0;
            for (const rId of memberRoles) {
                const role = allRoles.find(r => r.id === rId);
                if (role && role.position > highest) highest = role.position;
            }
            return highest;
        };

        const botPos = getHighestRolePos(botMember.roles);
        const targetPos = getHighestRolePos(targetMember.roles);
        
        if (targetMember.user.id === guild.owner_id) {
            throw new Error(`CRITICO: L'utente bersaglio è il PROPRIETARIO del server. Discord impedisce fisicamente a chiunque di moderare l'owner.`);
        }

        if (botPos <= targetPos && targetPos > 0) {
            throw new Error(`GERARCHIA ERRATA: Il ruolo del bot (Livello ${botPos}) è INFERIORE o UGUALE a quello del bersaglio (Livello ${targetPos}). Discord BLOCCA SEMPRE l'azione. Vai nelle Impostazioni Server -> Ruoli e trascina il ruolo del bot sopra a tutti!`);
        }
    } catch (e) {
        if (e.message.includes("CRITICO") || e.message.includes("GERARCHIA ERRATA")) throw e;
        // Altrimenti ignora silenziosamente gli errori di diagnostica
    }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_channel": {
        const body = { name: args.name, type: args.type };
        if (args.parent_id) body.parent_id = args.parent_id;
        const res = await discordApiRequest(`/guilds/${args.guild_id}/channels`, "POST", body);
        return { content: [{ type: "text", text: `Canale creato! ID: ${res.id}` }] };
      }
      
      case "create_channels_bulk": {
        let structure = [];
        try {
            structure = JSON.parse(args.structure_json);
        } catch(e) {
            throw new Error("structure_json non è un JSON valido");
        }
        let report = "Creazione Massiva Completata:\n";
        for (const cat of structure) {
            // Crea categoria (type 4)
            const catRes = await discordApiRequest(`/guilds/${args.guild_id}/channels`, "POST", { name: cat.categoryName, type: 4 });
            report += `[Categoria] ${catRes.name} (${catRes.id})\n`;
            
            for (const ch of cat.channels || []) {
                const chRes = await discordApiRequest(`/guilds/${args.guild_id}/channels`, "POST", { name: ch.name, type: ch.type || 0, parent_id: catRes.id });
                report += `  -> [Canale] ${chRes.name} (${chRes.id})\n`;
                await new Promise(r => setTimeout(r, 500)); // Rate limit
            }
        }
        return { content: [{ type: "text", text: report }] };
      }
      
      case "delete_channel": {
        await discordApiRequest(`/channels/${args.channel_id}`, "DELETE");
        return { content: [{ type: "text", text: `Canale eliminato.` }] };
      }
      
      case "create_role": {
        const body = { name: args.name };
        if (args.color) body.color = args.color;
        if (args.permissions) body.permissions = args.permissions;
        const res = await discordApiRequest(`/guilds/${args.guild_id}/roles`, "POST", body);
        return { content: [{ type: "text", text: `Ruolo creato! ID: ${res.id}` }] };
      }
      
      case "delete_role": {
        await discordApiRequest(`/guilds/${args.guild_id}/roles/${args.role_id}`, "DELETE");
        return { content: [{ type: "text", text: `Ruolo eliminato.` }] };
      }
      
      case "assign_role": {
        await discordApiRequest(`/guilds/${args.guild_id}/members/${args.user_id}/roles/${args.role_id}`, "PUT");
        return { content: [{ type: "text", text: `Ruolo assegnato.` }] };
      }
      
      case "remove_role": {
        await discordApiRequest(`/guilds/${args.guild_id}/members/${args.user_id}/roles/${args.role_id}`, "DELETE");
        return { content: [{ type: "text", text: `Ruolo rimosso.` }] };
      }
      
      case "rename_channel": {
        await discordApiRequest(`/channels/${args.channel_id}`, "PATCH", { name: args.new_name });
        return { content: [{ type: "text", text: `Canale rinominato in ${args.new_name}.` }] };
      }
      
      case "change_nickname": {
        await discordApiRequest(`/guilds/${args.guild_id}/members/${args.user_id}`, "PATCH", { nick: args.new_nickname });
        return { content: [{ type: "text", text: `Nickname cambiato in ${args.new_nickname}.` }] };
      }
      
      case "lock_channel": {
        // ID della guild serve per overridare @everyone che ha lo stesso ID della guild
        await discordApiRequest(`/channels/${args.channel_id}/permissions/${args.guild_id}`, "PUT", {
            type: 0,
            allow: "0",
            deny: "2048" // SEND_MESSAGES
        });
        return { content: [{ type: "text", text: `Canale bloccato agli utenti normali.` }] };
      }
      
      case "unlock_channel": {
        await discordApiRequest(`/channels/${args.channel_id}/permissions/${args.guild_id}`, "DELETE");
        return { content: [{ type: "text", text: `Canale sbloccato.` }] };
      }
      
      case "purge_messages": {
        const msgs = await discordApiRequest(`/channels/${args.channel_id}/messages?limit=${Math.min(args.amount, 100)}`, "GET");
        const msgIds = msgs.map(m => m.id);
        if (msgIds.length === 1) {
            await discordApiRequest(`/channels/${args.channel_id}/messages/${msgIds[0]}`, "DELETE");
        } else if (msgIds.length > 1) {
            await discordApiRequest(`/channels/${args.channel_id}/messages/bulk-delete`, "POST", { messages: msgIds });
        }
        return { content: [{ type: "text", text: `Eliminati ${msgIds.length} messaggi.` }] };
      }
      
      case "pin_message": {
        await discordApiRequest(`/channels/${args.channel_id}/pins/${args.message_id}`, "PUT");
        return { content: [{ type: "text", text: `Messaggio pinnato.` }] };
      }
      
      case "unpin_message": {
        await discordApiRequest(`/channels/${args.channel_id}/pins/${args.message_id}`, "DELETE");
        return { content: [{ type: "text", text: `Messaggio despinnato.` }] };
      }
      
      case "set_slowmode": {
        await discordApiRequest(`/channels/${args.channel_id}`, "PATCH", { rate_limit_per_user: args.seconds });
        return { content: [{ type: "text", text: `Slowmode impostato a ${args.seconds} secondi.` }] };
      }
      
      case "create_invite": {
        const inv = await discordApiRequest(`/channels/${args.channel_id}/invites`, "POST", { max_age: 0, max_uses: 0 });
        return { content: [{ type: "text", text: `Invito creato: https://discord.gg/${inv.code}` }] };
      }
      
      case "get_server_info": {
        const guild = await discordApiRequest(`/guilds/${args.guild_id}?with_counts=true`, "GET");
        const info = `Nome: ${guild.name}\nMembri Totali: ${guild.approximate_member_count}\nID Proprietario: ${guild.owner_id}\nRuoli: ${guild.roles.length}`;
        return { content: [{ type: "text", text: info }] };
      }

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
        
        await verifyModeration(guildId, args.user_id);
        
        if (args.send_dm) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: `Sei stato messo in timeout in ${guildId}. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        const isPesante = args.modo_pesante || args.user_id === "1485661536524697782";
        const duration = isPesante ? (args.duration_minutes > 0 ? args.duration_minutes * 10 : 10080) : args.duration_minutes; // Max 1 settimana se pesante
        const timeoutUntil = duration > 0 ? new Date(Date.now() + duration * 60000).toISOString() : null;
        
        try {
            await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { communication_disabled_until: timeoutUntil }, args.reason || (isPesante ? "Timeout pesante via MCP" : undefined));
        } catch (e) {
            if (e.message.includes("50013")) throw new Error("ERRORE 50013: Manca il permesso. (1) Il server potrebbe avere l'impostazione 'Richiedi 2FA per Moderazione', quindi il TUO account creatore del bot DEVE avere l'autenticazione a due fattori attiva. (2) Altrimenti hai dimenticato di dare 'Timeout Members' al bot, oppure il ruolo del bot è sotto quello dell'utente.");
            throw e;
        }
        return { content: [{ type: "text", text: `Utente ${args.user_id} in timeout per ${duration}m.${isPesante ? " (MODALITÀ PESANTE APPLICATA)" : ""}` }] };
      }
      
      case "move_to_voice_channel": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        await verifyModeration(guildId, args.user_id);
        await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { channel_id: args.channel_id });
        return { content: [{ type: "text", text: `Utente ${args.user_id} spostato nel canale vocale ${args.channel_id}.` }] };
      }

      case "kick_user": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        if (!guildId) throw new Error("Manca guild_id o channel_id.");

        await verifyModeration(guildId, args.user_id);
        
        const isPesante = args.modo_pesante || args.user_id === "1485661536524697782";

        if (isPesante) {
            try {
                // Rimuovi tutti i ruoli non gestiti
                const member = await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "GET");
                const allRoles = await discordApiRequest(`/guilds/${guildId}/roles`, "GET");
                const managedRoleIds = allRoles.filter(r => r.managed).map(r => r.id);
                const rolesToKeep = member.roles.filter(id => managedRoleIds.includes(id));
                await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { roles: rolesToKeep });
                
                // Muta l'utente a tempo record per precauzione
                const timeoutUntil = new Date(Date.now() + 5 * 60000).toISOString();
                await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { communication_disabled_until: timeoutUntil });
                
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.error("Modo pesante stripping fallito (ignorabile):", e.message);
            }
        }

        if (args.send_dm || isPesante) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: isPesante ? `⚠️ SEI STATO ESTIRPATO DAL SERVER! ⚠️\nNessuna pietà per te. Addio.` : `Sei stato kickato. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        try {
            await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "DELETE", null, args.reason);
        } catch (e) {
            if (e.message.includes("50013")) throw new Error("ERRORE 50013: Manca il permesso Kick. SE GLI HAI GIÀ DATO L'AMMINISTRATORE, il problema è il 2FA. Devi attivare l'Autenticazione a Due Fattori (MFA) sul tuo account Discord personale, altrimenti Discord ti impedisce di usare bot con poteri amministrativi in server protetti!");
            throw e;
        }
        return { content: [{ type: "text", text: `Utente ${args.user_id} espulso (kick) con successo dal server.${isPesante ? " (MODALITÀ PESANTE APPLICATA)" : ""}` }] };
      }

      case "ban_user": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        if (!guildId) throw new Error("Manca guild_id o channel_id.");
        
        await verifyModeration(guildId, args.user_id);

        const isPesante = args.modo_pesante || args.user_id === "1485661536524697782";
        let deleteSecs = args.delete_message_seconds || 0;

        if (isPesante) {
            deleteSecs = 604800; // 7 days (maximum allowed)
            try {
                // Strippa i ruoli per umiliarlo prima del ban
                const member = await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "GET");
                const allRoles = await discordApiRequest(`/guilds/${guildId}/roles`, "GET");
                const managedRoleIds = allRoles.filter(r => r.managed).map(r => r.id);
                const rolesToKeep = member.roles.filter(id => managedRoleIds.includes(id));
                await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { roles: rolesToKeep });
                
                // Muta 
                const timeoutUntil = new Date(Date.now() + 5 * 60000).toISOString();
                await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { communication_disabled_until: timeoutUntil });
                
                await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
                console.error("Modo pesante stripping fallito (ignorabile):", e.message);
            }
        }

        if (args.send_dm || isPesante) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: isPesante ? `🔨 SEI STATO ANIENTATO E BANNATO DAL SERVER. \nOgni tua traccia (7 giorni di messaggi) verrà distrutta. Addio per sempre.` : `Sei stato bannato da ${guildId}. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        try {
            await discordApiRequest(`/guilds/${guildId}/bans/${args.user_id}`, "PUT", { delete_message_seconds: deleteSecs }, args.reason || (isPesante ? "Bannato pesantemente via MCP" : undefined));
        } catch (e) {
            if (e.message.includes("50013")) throw new Error("ERRORE 50013 FATALE: Hai dato tutti i permessi ma Discord blocca il Ban. Questo significa al 100% che il server ha la 'Moderazione 2FA' attiva. Discord VIETA ai tuoi bot di bannare qualcuno se TU (il proprietario del bot) non hai abilitato l'Autenticazione a Due Fattori sul tuo account utente personale di Discord. Attivala e funzionerà al primo colpo.");
            throw e;
        }
        return { content: [{ type: "text", text: `Utente ${args.user_id} bannato con successo dal server.${isPesante ? " (MODALITÀ DISTRUZIONE PESANTE APPLICATA: 7 giorni di messaggi rimossi)" : ""}` }] };
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

        // --- DIAGNOSTICA AVANZATA GERARCHIA RUOLI ---
        try {
            const me = await discordApiRequest("/users/@me", "GET");
            const botId = me.id;
            
            const [botMember, targetMember, allRoles] = await Promise.all([
                discordApiRequest(`/guilds/${guildId}/members/${botId}`, "GET"),
                discordApiRequest(`/guilds/${guildId}/members/${userId}`, "GET"),
                discordApiRequest(`/guilds/${guildId}/roles`, "GET")
            ]);
            
            const getHighestRolePos = (memberRoles) => {
                let highest = 0;
                for (const rId of memberRoles) {
                    const role = allRoles.find(r => r.id === rId);
                    if (role && role.position > highest) highest = role.position;
                }
                return highest;
            };

            const botPos = getHighestRolePos(botMember.roles);
            const targetPos = getHighestRolePos(targetMember.roles);
            
            const isTargetOwner = targetMember.user.id === (await discordApiRequest(`/guilds/${guildId}`, "GET")).owner_id;

            if (isTargetOwner) {
                return { content: [{ type: "text", text: `ERRORE CRITICO PREVENUTO: L'utente che stai cercando di colpire (${userId}) è l'OWNER (Proprietario) del server! Nessun bot o amministratore può moderare il proprietario. Azione annullata.` }], isError: true };
            }

            if (botPos <= targetPos && targetPos > 0) {
                return { content: [{ type: "text", text: `ERRORE GERARCHIA PREVENUTO: Il bot ha un livello di potere massimo pari a [${botPos}], mentre il bersaglio ha un livello pari a [${targetPos}]. Discord blocca qualsiasi azione se il bot non è STRETTAMENTE SUPERIORE al bersaglio. Vai nelle Impostazioni Server -> Ruoli e trascina il ruolo del bot sopra a tutti gli altri!` }], isError: true };
            }
        } catch (diagErr) {
            console.error("Diagnostica gerarchia fallita (probabile mancanza permessi base):", diagErr.message);
        }
        // --- FINE DIAGNOSTICA ---

        let errors = [];

        // Fase 1: Rimuovi i ruoli (in modo intelligente per evitare 403 su ruoli gestiti come i Booster)
        try {
            const member = await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "GET");
            const allRoles = await discordApiRequest(`/guilds/${guildId}/roles`, "GET");
            // Trova gli ID dei ruoli che sono "gestiti" (es. bot, booster) che non possono essere rimossi
            const managedRoleIds = allRoles.filter(r => r.managed).map(r => r.id);
            // Manteniamo solo i ruoli gestiti che l'utente ha già, rimuovendo tutti gli altri
            const rolesToKeep = member.roles.filter(id => managedRoleIds.includes(id));
            
            await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "PATCH", { roles: rolesToKeep });
        } catch (e) {
            errors.push("Rimuovi Ruoli Fallito: " + e.message + " (Nota: Assegna il permesso 'Amministratore' al bot e tienilo in CIMA alla lista ruoli)");
        }

        // Fase 2: Sposta nel canale vocale
        try {
            await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "PATCH", { channel_id: channelId });
        } catch (e) {
            if (e.message.includes("400")) {
                errors.push("Spostamento Vocale Fallito: L'utente target DEVE essere già connesso a un canale vocale (qualsiasi) per poter essere spostato!");
            } else {
                errors.push("Spostamento Vocale Fallito: " + e.message);
            }
        }

        // Fase 3: Pausa di 10 secondi e poi Timeout
        await new Promise(resolve => setTimeout(resolve, 10000));
        const timeoutUntil = new Date(Date.now() + duration * 60000).toISOString();
        try {
            await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "PATCH", { communication_disabled_until: timeoutUntil });
        } catch (e) {
            errors.push("Timeout Fallito: " + e.message + " (Il bot non può mettere in timeout utenti con poteri da Amministratore o superiori ai suoi)");
        }

        if (errors.length > 0) {
            throw new Error("Discord API ha rifiutato l'azione! (Verifica i permessi: dai 'Amministratore' al bot e posizionalo in alto).\nDettagli:\n" + errors.join("\n"));
        }

        return { content: [{ type: "text", text: `Successo! Server ID [${guildId}] risolto. L'utente ${userId} è stato isolato dai ruoli, spostato nel canale ${channelId}, abbiamo atteso 10s e applicato il timeout per ${duration}m.` }] };
      }

      case "delayed_moderation_action": {
        const guildId = args.guild_id;
        const userId = args.user_id;
        const action = args.action;
        const delay = args.delay_seconds * 1000;

        setTimeout(async () => {
            try {
                if (action === "kick") {
                    await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "DELETE");
                } else if (action === "ban") {
                    await discordApiRequest(`/guilds/${guildId}/bans/${userId}`, "PUT", { delete_message_seconds: 0 });
                } else if (action === "timeout") {
                    const timeoutUntil = new Date(Date.now() + 60000 * 60).toISOString(); // 1h default for delayed
                    await discordApiRequest(`/guilds/${guildId}/members/${userId}`, "PATCH", { communication_disabled_until: timeoutUntil });
                }
                console.log(`[DelayedAction] ${action} eseguito su ${userId} con successo!`);
            } catch (e) {
                console.error(`[DelayedAction] Errore nell'eseguire ${action} su ${userId}:`, e);
            }
        }, delay);

        return { content: [{ type: "text", text: `⏳ Azione di ${action} schedulata! Verrà eseguita in background tra ${args.delay_seconds} secondi su utente ${userId}.` }] };
      }

      case "show_current_roles_channel": {
          const fs = require('fs');
          const path = require('path');
          
          const scriptCode = `
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch("${args.guild_id}");
        const channel = await guild.channels.fetch("${args.channel_id}");
        if (!channel.isVoiceBased()) throw new Error("Non è un canale vocale.");
        
        let out = "Utenti in canale: " + channel.name + "\\n";
        for (const [memberId, member] of channel.members) {
            const roleIds = member.roles.cache.map(r => r.id).join(", ");
            out += \`- Utente \${member.user.tag} (ID: \${member.id}) -> Ruoli: \${roleIds}\\n\`;
        }
        
        fs.writeFileSync(require('path').join(__dirname, 'voice_roles_result.txt'), out);
        client.destroy();
        process.exit(0);
    } catch(e) {
        fs.writeFileSync(require('path').join(__dirname, 'voice_roles_result.txt'), "Errore: " + e.message);
        process.exit(1);
    }
});

const configPath = require('path').join(__dirname, '../../mcp_configs/unsloth_mcp.json');
let token = process.env.DISCORD_MCP_TOKEN;
if (!token) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        token = config.env.DISCORD_MCP_TOKEN;
    } catch(e) {}
}
client.login(token);
`;
          const scriptPath = path.join(__dirname, 'fetch_voice_roles.js');
          const resultPath = path.join(__dirname, 'voice_roles_result.txt');
          fs.writeFileSync(scriptPath, scriptCode);
          
          // Execute synchronously for MCP
          const { execSync } = require('child_process');
          try {
              execSync('node fetch_voice_roles.js', { cwd: __dirname, timeout: 15000 });
              const result = fs.readFileSync(resultPath, 'utf8');
              return { content: [{ type: "text", text: result }] };
          } catch(e) {
              return { content: [{ type: "text", text: "Si è verificato un errore durante il fetch degli utenti in vocale. Assicurati che il bot sia acceso e il canale sia corretto." }] };
          }
      }

      case "remove_all_roles": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        if (!guildId) throw new Error("guild_id mancante");

        const member = await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "GET");
        const allRoles = await discordApiRequest(`/guilds/${guildId}/roles`, "GET");
        
        const managedRoleIds = allRoles.filter(r => r.managed).map(r => r.id);
        const ignoredRoleIds = args.ignore_roles || [];
        
        // Conserva solo i ruoli gestiti (intoccabili) e i ruoli ignorati esplicitamente
        const rolesToKeep = member.roles.filter(id => managedRoleIds.includes(id) || ignoredRoleIds.includes(id));
        
        await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { roles: rolesToKeep });

        return { content: [{ type: "text", text: `Successo: rimossi tutti i ruoli all'utente ${args.user_id} tranne quelli ignorati (${ignoredRoleIds.join(", ")}).` }] };
      }
      
      case "search_image": {
        const query = args.query;
        let imageUrl = null;
        try {
            // Usa Wikimedia API per trovare l'immagine del miglior articolo corrispondente
            const url = `https://it.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageimages&pithumbsize=1000&format=json`;
            const req = await fetch(url);
            const data = await req.json();
            if (data && data.query && data.query.pages) {
                const pages = Object.values(data.query.pages);
                if (pages.length > 0 && pages[0].thumbnail) {
                    imageUrl = pages[0].thumbnail.source;
                }
            }
        } catch (e) {
            console.error("Image search error:", e);
        }

        if (imageUrl) {
            return { content: [{ type: "text", text: `Ecco l'immagine trovata (formato Markdown): ![${query}](${imageUrl})` }] };
        } else {
            return { content: [{ type: "text", text: `Nessuna immagine trovata per "${query}". Prova con termini più semplici.` }] };
        }
      }

      case "automatize_channel": {
        const targetId = args.target_id;
        const action = args.action;
        
        // Fase 1: Identifica se target_id è una Guild o un Channel
        let guildId = targetId;
        let isGuild = false;
        try {
            const guildCheck = await discordApiRequest(`/guilds/${targetId}`, "GET");
            if (guildCheck.id) isGuild = true;
        } catch (e) {}

        let baseChannelId = null;
        if (!isGuild) {
            try {
                const channelData = await discordApiRequest(`/channels/${targetId}`, "GET");
                guildId = channelData.guild_id;
                baseChannelId = targetId;
                if (!guildId) throw new Error("Il canale non appartiene a un server.");
            } catch (e) {
                throw new Error("ID non valido: non è né un server né un canale esistente. (404 Unknown)");
            }
        }

        // AZIONE: ANALYZE
        if (action === "analyze") {
            const channels = await discordApiRequest(`/guilds/${guildId}/channels`, "GET");
            const roles = await discordApiRequest(`/guilds/${guildId}/roles`, "GET");
            
            const textChannels = channels.filter(c => c.type === 0).map(c => `- ${c.name} (ID: ${c.id})`).join("\n");
            const categories = channels.filter(c => c.type === 4).map(c => `- ${c.name}`).join("\n");
            const rolesList = roles.map(r => `- ${r.name}`).join("\n");
            
            return {
                content: [{
                    type: "text",
                    text: `🔍 **ANALISI SERVER COMPLETATA** (ID: ${guildId})\n\n**Categorie Attuali:**\n${categories || "Nessuna"}\n\n**Canali Testuali:**\n${textChannels || "Nessuno"}\n\n**Ruoli Attuali:**\n${rolesList || "Nessuno"}\n\n➡️ **Passo successivo per l'IA**: Ora che hai letto la struttura, richiama il tool 'automatize_channel' con action="execute" fornendo new_categories, new_channels, new_roles e un topic per automatizzarlo!`
                }]
            };
        }

        // AZIONE: EXECUTE
        if (action === "execute") {
            const topic = args.topic || "Generico";
            let createdRoles = [];
            let createdChannels = [];
            let targetWebhookChannelId = baseChannelId;

            // 1. Crea Ruoli
            if (args.new_roles && args.new_roles.length > 0) {
                for (const roleName of args.new_roles) {
                    try {
                        const newRole = await discordApiRequest(`/guilds/${guildId}/roles`, "POST", { name: roleName, color: Math.floor(Math.random() * 16777215) });
                        createdRoles.push(newRole.name);
                    } catch (e) { console.error("Errore ruolo:", e); }
                }
            }

            // 2. Crea Categorie e Canali
            let parentId = null;
            if (args.new_categories && args.new_categories.length > 0) {
                try {
                    const category = await discordApiRequest(`/guilds/${guildId}/channels`, "POST", { name: args.new_categories[0], type: 4 });
                    parentId = category.id;
                } catch (e) { console.error("Errore categoria:", e); }
            }

            if (args.new_channels && args.new_channels.length > 0) {
                for (const chName of args.new_channels) {
                    try {
                        const newCh = await discordApiRequest(`/guilds/${guildId}/channels`, "POST", { name: chName, type: 0, parent_id: parentId });
                        createdChannels.push(newCh.name);
                        targetWebhookChannelId = newCh.id; // Usa l'ultimo canale creato come target del webhook
                    } catch (e) { console.error("Errore canale:", e); }
                }
            }

            if (!targetWebhookChannelId) {
                // Se non c'è un baseChannelId e non ne ha creati, prende il primo testuale a caso
                const allCh = await discordApiRequest(`/guilds/${guildId}/channels`, "GET");
                const firstText = allCh.find(c => c.type === 0);
                if (firstText) targetWebhookChannelId = firstText.id;
                else throw new Error("Nessun canale in cui creare il Webhook!");
            }

            // 3. Crea Webhook
            let webhookUrl = "";
            try {
                const webhook = await discordApiRequest(`/channels/${targetWebhookChannelId}/webhooks`, "POST", { name: `${topic} Scraper` });
                webhookUrl = `https://discord.com/api/v10/webhooks/${webhook.id}/${webhook.token}`;
            } catch (e) {
                console.error(`Impossibile creare webhook: ${e.message}`);
            }

            // 4. Crea file Python (Scraper)
            const fs = require('fs');
            const path = require('path');
            const scriptName = `scraper_${topic.replace(/\s+/g, "_").toLowerCase()}.py`;
            const scriptPath = path.join(__dirname, scriptName);
            
            const pythonCode = `import requests\nfrom bs4 import BeautifulSoup\nimport time\n\nWEBHOOK_URL = "${webhookUrl}"\nTOPIC = "${topic}"\n\ndef scrape_and_send():\n    try:\n        url = 'https://news.google.com/search?q=' + TOPIC.replace(' ', '%20')\n        html = requests.get(url).text\n        soup = BeautifulSoup(html, 'html.parser')\n        articles = soup.find_all('article')\n        if articles:\n            title = articles[0].text\n            message = {"content": f"📰 **Automazione {TOPIC}:**\\n{title}"}\n            requests.post(WEBHOOK_URL, json=message)\n            print("News inviata con successo!")\n    except Exception as e:\n        print(f"Errore nello scraping: {e}")\n\nif __name__ == "__main__":\n    scrape_and_send()\n`;
            
            fs.writeFileSync(scriptPath, pythonCode);

            return { 
                content: [{ 
                    type: "text", 
                    text: `✅ **Automazione Server Completata!**\n\n1. Nuovi Ruoli: ${createdRoles.join(", ") || "Nessuno"}\n2. Nuovi Canali: ${createdChannels.join(", ") || "Nessuno"}\n3. Webhook creato in canale: <#${targetWebhookChannelId}>\n4. Script Python autogenerato in: ${scriptPath}` 
                }] 
            };
        }
      }

      case "mute_deafen_user": {
        try {
            await discordApiRequest(`/guilds/${args.guild_id}/members/${args.user_id}`, "PATCH", {
                mute: args.mute,
                deaf: args.deaf
            });
            return { content: [{ type: "text", text: `Successo: Utente ${args.user_id} aggiornato! Mute: ${args.mute}, Deaf: ${args.deaf}` }] };
        } catch (e) {
            if (e.message.includes("50013")) throw new Error("Errore 50013: Manca il permesso MUTE_MEMBERS o DEAFEN_MEMBERS al bot, oppure stai cercando di silenziare qualcuno più in alto di te nella gerarchia dei ruoli.");
            throw e;
        }
      }

      case "play_music": {
          const fs = require('fs');
          const path = require('path');
          const { spawn } = require('child_process');
          
          let resolvedGuildId = args.guild_id;
          if (!resolvedGuildId) {
              const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
              resolvedGuildId = ch.guild_id;
          }
          if (!resolvedGuildId) throw new Error("Impossibile dedurre il server (guild_id) dal canale fornito.");

          const scriptCode = `
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch("${resolvedGuildId}");
        const channel = await guild.channels.fetch("${args.channel_id}");
        
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const stream = await play.stream("${args.url}");
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        const player = createAudioPlayer();
        
        player.play(resource);
        connection.subscribe(player);
        
        player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
            client.destroy();
            process.exit(0);
        });
        
        player.on('error', error => {
            console.error('Error:', error.message);
            connection.destroy();
            client.destroy();
            process.exit(1);
        });
    } catch(e) {
        console.error("Errore:", e);
        process.exit(1);
    }
});

const configPath = require('path').join(__dirname, '../../mcp_configs/unsloth_mcp.json');
let token = process.env.DISCORD_MCP_TOKEN;
if (!token) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        token = config.env.DISCORD_MCP_TOKEN;
    } catch(e) {}
}

client.login(token);
`;
          const scriptPath = path.join(__dirname, 'music_player_bot.js');
          fs.writeFileSync(scriptPath, scriptCode);
          
          const child = spawn('node', [scriptPath], { detached: true, stdio: 'ignore', env: process.env });
          child.unref();

          return { content: [{ type: "text", text: `🎵 Ho avviato il bot musicale in background! Entrerà nel canale vocale <#${args.channel_id}> e riprodurrà: ${args.url}` }] };
      }

      case "search_user_information": {
        const username = args.username;
        const sites = [
            { name: "GitHub", url: `https://github.com/${username}` },
            { name: "X/Twitter", url: `https://twitter.com/${username}` },
            { name: "Reddit", url: `https://www.reddit.com/user/${username}` },
            { name: "Instagram", url: `https://www.instagram.com/${username}/` },
            { name: "Steam", url: `https://steamcommunity.com/id/${username}` }
        ];

        let results = [];
        for (const site of sites) {
            try {
                const response = await fetch(site.url, {
                    method: 'GET',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
                });
                if (response.status === 200) {
                    results.push(`✅ TROVATO: ${site.name} -> ${site.url}`);
                } else {
                    results.push(`❌ Non Trovato: ${site.name}`);
                }
            } catch (e) {
                results.push(`⚠️ Errore con ${site.name}`);
            }
        }
        return { content: [{ type: "text", text: `🔎 Ricerca OSINT (Sherlock) per l'utente '${username}':\n\n${results.join('\n')}` }] };
      }

      case "webcam_image": {
          const fs = require('fs');
          const path = require('path');
          
          // Salva la configurazione affinché il plugin Vencord showCamera possa leggerla
          const configPath = path.join(__dirname, '..', '..', 'fake_camera_config.json');
          fs.writeFileSync(configPath, JSON.stringify({
              channelId: args.channel_id,
              imageUrl: args.image_url,
              active: true
          }));

          return { content: [{ type: "text", text: `📷 Configurazione Webcam salvata con l'immagine fornita!\nAssicurati di aver compilato il plugin Vencord 'showCamera' che leggerà questa immagine per trasmetterla al posto della tua webcam vera nel canale ${args.channel_id}.` }] };
      }

      case "auto_message": {
          const fs = require('fs');
          const path = require('path');
          const { spawn } = require('child_process');
          
          const scriptCode = `
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== "${args.channel_id}") return;
    
    // Se c'è un target, ignora gli altri
    const target = "${args.target_user_id || ''}";
    if (target && target !== "null" && message.author.id !== target) return;

    try {
        await message.channel.sendTyping();
        
        // Chiamata all'API di Unsloth
        const response = await fetch("${args.unsloth_api_url}", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'unsloth-local', 
                messages: [
                    { role: 'system', content: \`${args.system_prompt}\` },
                    { role: 'user', content: message.content }
                ],
                stream: false
            })
        });

        const data = await response.json();
        let replyText = data.choices ? data.choices[0].message.content : (data.response || "Non so cosa dire!");
        await message.reply(replyText);
    } catch (error) {
        console.error('Errore:', error);
    }
});

const configPath = require('path').join(__dirname, '../../mcp_configs/unsloth_mcp.json');
let token = process.env.DISCORD_MCP_TOKEN;
if (!token) {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        token = config.env.DISCORD_MCP_TOKEN;
    } catch(e) {}
}

client.login(token);
console.log("Bot in ascolto...");
`;
          const scriptPath = path.join(__dirname, 'auto_message_bot.js');
          fs.writeFileSync(scriptPath, scriptCode);
          
          const child = spawn('node', [scriptPath], { detached: true, stdio: 'ignore', env: process.env });
          child.unref();

          return { content: [{ type: "text", text: `🤖 Bot Auto-Message Avviato! Il bot è ora in ascolto nel canale <#${args.channel_id}> e userà l'intelligenza artificiale per rispondere in automatico ai messaggi!` }] };
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
