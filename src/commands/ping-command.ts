import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

export const pingCommand = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: `🏓 ${interaction.client.ws.ping}ms`, ephemeral: true });
  },
};
