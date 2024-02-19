const Discord = require('discord.js');
const xml2js = require('xml2js');
const fs = require('fs');

// **Pliki konfiguracyjne:**
const config = require('./config.json'); // Plik JSON z tokenem, ID serwera i URL gry

const PLAYERS = new Map();
const LOBBIES = new Map();

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildVoiceStates,
  ],
});

client.on('ready', async () => {
  console.log('Bot is ready!');
});

client.on('message', async message => {
  const content = message.content;

  if (content === '!link') {
    message.channel.send('Podaj link do gry:');
  } else if (content.startsWith('http')) {
    // Pobierz link do gry
    const gameUrl = content;
    // Wczytaj stronę gry
    const response = await fetch(gameUrl);
    const text = await response.text();
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(text);
    // ...

    // Aktualizuj dane lobby na podstawie danych z gry
    const lobby = LOBBIES.get(message.channel.id);
    if (lobby) {
      lobby.status = 'w toku';
      lobby.players = result.game.player;
      sendLobbyMessage(message, lobby);
    } else {
      console.error(`Failed to find lobby for channel: ${message.channel.id}`);
    }

  } else if (content.startsWith('!gracz')) {
    const [command, nick] = content.split(' ');
    if (nick) {
      const discordNick = message.author.username;
      PLAYERS.set(discordNick, nick);
      message.channel.send('Zarejestrowano pomyślnie!');
    } else {
      message.channel.send('Nieprawidłowy format komendy. Użyj `!gracz (nick)`');
    }
  } else if (content === '!rozpocznij gre') {
    // Pobierz dane graczy ze strony
    const response = await fetch(config.GAME_URL);
    const text = await response.text();
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(text);
    const teams = result.game.team;

    for (const team of teams) {
      const teamName = team.$.name;
      const voiceChannel = await createVoiceChannel(teamName);

      const players = team.player;
      for (const player of players) {
        const gameNick = player.$.name;
        const discordNick = findDiscordNick(gameNick);
        if (discordNick) {
          const member = await getMember(discordNick);
          await member.joinVoiceChannel(voiceChannel);
        }
      }
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
      const playersList = players.map(player => player.$.name).join(', ');
      message.channel.send(`Lista graczy: ${playersList}`);
    } else {
      message.channel.send('Brak gry w tym kanale');
    }
  } else if (content === '!koniec') {
    // Przenieś wszystkich graczy do głównego kanału głosowego
    const mainChannel = client.guilds.cache.get(config.serverId).channels.cache.get(config.mainChannelId);
    const lobby = LOBBIES.get(message.channel.id);
    if (lobby) {
      const players = lobby.players;
      for (const player of players) {
        const gameNick = player.$.name;
        const discordNick = findDiscordNick(gameNick);
        if (discordNick) {
          const member = await getMember(discordNick);
          await member.joinVoiceChannel(mainChannel);
        }
      }
      // Usuń lobby
      LOBBIES.delete(message.channel.id);
    } else {
      message.channel.send('Nieznana komenda.');
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
  
  function sendLobbyMessage(message, lobby) {
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
  if (!fs.existsSync('./config.json')) {
    console.error('Brak pliku konfiguracyjnego config.json!');
    process.exit(1);
  }
  
  // Uruchom bota
  client.login(config.token);