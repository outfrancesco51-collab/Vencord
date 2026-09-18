
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch("1431794258511269958");
        const channel = await guild.channels.fetch("1431794258511269958");
        if (!channel.isVoiceBased()) throw new Error("Non è un canale vocale.");
        
        let out = "Utenti in canale: " + channel.name + "\n";
        for (const [memberId, member] of channel.members) {
            const roleIds = member.roles.cache.map(r => r.id).join(", ");
            out += `- Utente ${member.user.tag} (ID: ${member.id}) -> Ruoli: ${roleIds}\n`;
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
