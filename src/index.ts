import { Client, GatewayIntentBits } from 'discord.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { db } from './database/pool.js';
import { onInteractionCreate } from './events/interaction-create.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('clientReady', async () => {
  await db.query('select 1');
  logger.info({ user: client.user?.tag }, 'Frozen ticket bot is online');
});

client.on('interactionCreate', onInteractionCreate);

process.on('SIGINT', async () => {
  await db.end();
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => logger.error({ err: error }, 'Unhandled rejection'));
process.on('uncaughtException', (error) => logger.fatal({ err: error }, 'Uncaught exception'));

await client.login(env.DISCORD_TOKEN);
