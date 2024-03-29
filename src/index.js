const Discord = require('discord.js');
const xml2js = require('xml2js');
const fs = require('fs');
const { fetchGameData } = require('./game-data.js');

// **Pliki konfiguracyjne:**

    const config = require('./config/configuwu.json');
    const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildVoiceStates,
    ],
});
client.login(config.token);
 // Plik JSON z tokenem, ID serwera i URL gry

const PLAYERS = new Map();
const LOBBIES = new Map();
let bot = {
    client
}
module.exports = bot




client.on('ready', async () => {
    console.log('codenames bot jest gotowy do ruchania!');
});

client.on('messageCreate', (message) => {
    const content = message.content;

    if (content == "!link") {
        message.channel.send('Podaj link do gry:');
    
    } else if (content.startsWith('http')) {
        const gameUrl = content;
        try {
            const result =  fetchGameData(gameUrl);
            if (result) {
                // ... Zaktualizuj dane lobby na podstawie wyniku ...
                const lobby = LOBBIES.get(message.channel.id);
                if (lobby) {
                    lobby.status = 'w toku';
                    lobby.players = result.game.player;
                    sendLobbyMessage(message, lobby);
                } else {
                    console.error(`Failed to find lobby for channel: ${message.channel.id}`);
                }
            } else {
                message.channel.send('Błąd pobierania danych gry');
            }
        } catch (error) {
            console.error(error);
            message.channel.send('Błąd podczas przetwarzania linku do gry');
        }
    } else if (content.startsWith('!gracz')) {
        const [command, nick] = content.split(' ');
        if (nick) {
            const discordNick = message.author.username;
            PLAYERS.set(discordNick, nick);
            message.channel.send('Zarejestrowano pomyślnie!');
            bot.stop
        } else {
            message.channel.send('Nieprawidłowy format komendy. Użyj `!gracz (nick)`');
            bot.stop
        }
        
    } else if (content === '!rozpocznij gre') {
        try {
             fetchGameData();
        } catch (error) {
            console.error(error);
            message.channel.send('Błąd podczas rozpoczynania gry');
        }
    } else if (content.startsWith('!status')) {
        // Sprawdź status gry
        const lobby = LOBBIES.get(message.channel.id);
        if (lobby) {
            message.channel.send(`Status gry: ${lobby.status}`);
        } else {
            message.channel.send('Brak gry w tym kanale');
        }
    } else if (content.startsWith('!lista')) {
        // Wyświetl listę graczy
        const lobby = LOBBIES.get(message.channel.id);
        if (lobby) {
            const players = lobby.players;
            const playersList = players.map((player) => player.$.name).join(', ');
            message.channel.send(`Lista graczy: ${playersList}`);
        } else {
            message.channel.send('Brak gry w tym kanale');
            
        }
    } else if (content === '!koniec') {
        // Dodaj kod dla komendy !koniec
    } else {
        message.channel.send('Nieznana komenda.');
        bot.stop
    }
});

async function createVoiceChannel(teamName) {
    const guild = client.guilds.cache.get(config.serverId);
    if (!guild) {
        console.error(`Failed to find guild with ID: ${config.serverId}`);
        return null;
    }

    try {
        const channel = await guild.channels.create(teamName, {
            type: 'GUILD_VOICE',
            permissionOverwrites: [{
                id: guild.roles.everyone.id,
                deny: ['CONNECT'],
            }],
        });
        return channel;
    } catch (error) {
        console.error(`Error creating voice channel: ${error}`);
        return null;
    }
}

function findDiscordNick(gameNick) {
    for (const [discordNick, playerNick] of PLAYERS) {
        if (playerNick === gameNick) {
            return discordNick;
        }
    }
    return null;
}

async function getMember(discordNick) {
    const guild = client.guilds.cache.get(config.serverId);
    if (!guild) {
        console.error(`Failed to find guild with ID: ${config.serverId}`);
        return null;
    }

    const member = await guild.members.fetch(discordNick);
    if (!member) {
        console.error(`Failed to find member with nickname: ${discordNick}`);
        return null;
    }
    return member;
}

async function sendLobbyMessage(message, lobby) {
    const channel = message.channel;
    const players = lobby.players;

    for (const player of players) {
        const discordNick = findDiscordNick(player);
        if (discordNick) {
            const member = await getMember(discordNick);
            member.send(message);
        }
    }
}

// Wczytaj konfigurację


// Uruchom bota

