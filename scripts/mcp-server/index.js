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

        const timeoutUntil = new Date(Date.now() + args.duration_minutes * 60000).toISOString();
        try {
            await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "PATCH", { communication_disabled_until: timeoutUntil }, args.reason);
        } catch (e) {
            if (e.message.includes("50013")) throw new Error("ERRORE 50013: Manca il permesso. (1) Il server potrebbe avere l'impostazione 'Richiedi 2FA per Moderazione', quindi il TUO account creatore del bot DEVE avere l'autenticazione a due fattori attiva. (2) Altrimenti hai dimenticato di dare 'Timeout Members' al bot.");
            throw e;
        }
        return { content: [{ type: "text", text: `Utente ${args.user_id} in timeout per ${args.duration_minutes}m.` }] };
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

        if (args.send_dm) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: `Sei stato espulso (kick) da ${guildId}. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        try {
            await discordApiRequest(`/guilds/${guildId}/members/${args.user_id}`, "DELETE", null, args.reason);
        } catch (e) {
            if (e.message.includes("50013")) throw new Error("ERRORE 50013: Manca il permesso Kick. SE GLI HAI GIÀ DATO L'AMMINISTRATORE, il problema è il 2FA. Devi attivare l'Autenticazione a Due Fattori (MFA) sul tuo account Discord personale, altrimenti Discord ti impedisce di usare bot con poteri amministrativi in server protetti!");
            throw e;
        }
        return { content: [{ type: "text", text: `Utente ${args.user_id} espulso (kick) con successo dal server.` }] };
      }

      case "ban_user": {
        let guildId = args.guild_id;
        if (!guildId && args.channel_id) {
            const ch = await discordApiRequest(`/channels/${args.channel_id}`, "GET");
            guildId = ch.guild_id;
        }
        if (!guildId) throw new Error("Manca guild_id o channel_id.");
        
        await verifyModeration(guildId, args.user_id);

        if (args.send_dm) {
            await discordApiRequest("/users/@me/channels", "POST", { recipient_id: args.user_id })
              .then(dm => discordApiRequest(`/channels/${dm.id}/messages`, "POST", { content: `Sei stato bannato da ${guildId}. Motivo: ${args.reason || "Nessuno"}` }))
              .catch(e => console.error("Impossibile inviare DM:", e));
        }

        try {
            await discordApiRequest(`/guilds/${guildId}/bans/${args.user_id}`, "PUT", { delete_message_seconds: args.delete_message_seconds || 0 }, args.reason);
        } catch (e) {
            if (e.message.includes("50013")) throw new Error("ERRORE 50013 FATALE: Hai dato tutti i permessi ma Discord blocca il Ban. Questo significa al 100% che il server ha la 'Moderazione 2FA' attiva. Discord VIETA ai tuoi bot di bannare qualcuno se TU (il proprietario del bot) non hai abilitato l'Autenticazione a Due Fattori sul tuo account utente personale di Discord. Attivala e funzionerà al primo colpo.");
            throw e;
        }
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
