
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('ready', async () => {
    try {
        const guild = await client.guilds.fetch("1431795989190283305");
        const channel = await guild.channels.fetch("1431795989190283305");
        
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        const stream = await play.stream("https://www.youtube.com/watch?v=H9gH4Vs0_i0");
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
