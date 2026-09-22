import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { GuildRepository } from '../database/guild-repository.js';
import { panelButtons, panelEmbed } from '../ui/ticket-ui.js';

export const setupCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('إعداد نظام تذاكر Frozen')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) => option.setName('panel').setDescription('قناة فتح التذاكر').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addChannelOption((option) => option.setName('category').setDescription('تصنيف التذاكر').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    .addRoleOption((option) => option.setName('support').setDescription('رتبة فريق الدعم').setRequired(true))
    .addChannelOption((option) => option.setName('logs').setDescription('قناة سجلات التذاكر').addChannelTypes(ChannelType.GuildText).setRequired(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: true });

    const panel = interaction.options.getChannel('panel', true) as TextChannel;
    const category = interaction.options.getChannel('category', true);
    const support = interaction.options.getRole('support', true);
    const logs = interaction.options.getChannel('logs', true);

    const repo = new GuildRepository();
    await repo.upsert({
      guild_id: interaction.guild.id,
      panel_channel_id: panel.id,
      ticket_category_id: category.id,
      support_role_id: support.id,
      log_channel_id: logs.id,
    });

    await panel.send({ embeds: [panelEmbed()], components: [panelButtons()] });
    await interaction.editReply('✅ تم إعداد نظام التذاكر ونشر لوحة فتح التذكرة بنجاح.');
  },
};
