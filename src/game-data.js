async function fetchGameData() {
    try {
      const response = await fetch(config.GAME_URL);
      const text = await response.text();
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(text);
      return result;
    } catch (error) {
      console.error('Error fetching game data:', error);
      return null;
    }
  }

async function koniec() {
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
    }
}