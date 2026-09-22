import { REST, Routes } from 'discord.js';
import { env } from './config/env.js';
import { commands } from './commands/index.js';

const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
  body: commands.map((command) => command.data.toJSON()),
});
console.log('Discord slash commands deployed.');
