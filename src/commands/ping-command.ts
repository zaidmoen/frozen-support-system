import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

export const pingCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('فحص حالة البوت'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: `🏓 ${interaction.client.ws.ping}ms`, ephemeral: true });
  },
};
