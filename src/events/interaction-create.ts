import type { Interaction } from 'discord.js';
import { commands } from '../commands/index.js';
import { handleTicketButton, handleTicketModal } from '../interactions/ticket-interactions.js';
import { logger } from '../config/logger.js';

export async function onInteractionCreate(interaction: Interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commands.find((item) => item.data.name === interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }
    if (interaction.isButton()) return void await handleTicketButton(interaction);
    if (interaction.isModalSubmit()) return void await handleTicketModal(interaction);
  } catch (error) {
    logger.error({ err: error }, 'Interaction failed');
    if (interaction.isRepliable()) {
      const payload = { content: 'حدث خطأ غير متوقع. تم تسجيله للمراجعة.', ephemeral: true } as const;
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => undefined);
      else await interaction.reply(payload).catch(() => undefined);
    }
  }
}
