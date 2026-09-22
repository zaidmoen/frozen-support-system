import {
  ChannelType,
  PermissionFlagsBits,
  type ButtonInteraction,
  type Guild,
  type GuildMember,
  type ModalSubmitInteraction,
  type TextChannel,
} from 'discord.js';
import { GuildRepository } from '../database/guild-repository.js';
import { TicketRepository } from '../database/ticket-repository.js';
import { isSupport } from '../utils/permissions.js';
import { ticketControls, ticketEmbed } from '../ui/ticket-ui.js';

export class TicketService {
  constructor(
    private readonly guilds = new GuildRepository(),
    private readonly tickets = new TicketRepository(),
  ) {}

  async open(interaction: ModalSubmitInteraction, serviceTitle: string, details: string) {
    if (!interaction.guild || !interaction.member) throw new Error('Guild interaction required');
    const settings = await this.guilds.find(interaction.guild.id);
    if (!settings) throw new Error('TICKET_NOT_CONFIGURED');

    if (!settings.allow_multiple_open) {
      const current = await this.tickets.findOpenByUser(interaction.guild.id, interaction.user.id);
      if (current) return { existingChannelId: current.channel_id, ticket: null };
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 80) || 'ticket-new',
      type: ChannelType.GuildText,
      parent: settings.ticket_category_id,
      topic: `Frozen Support • ${interaction.user.id}`,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: settings.support_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
      ],
    });

    try {
      const ticket = await this.tickets.create({
        guildId: interaction.guild.id,
        channelId: channel.id,
        openerId: interaction.user.id,
        serviceTitle,
        details,
      });

      await channel.setName(`ticket-${String(ticket.ticket_number).padStart(4, '0')}`);
      await channel.send({
        content: `<@${interaction.user.id}> <@&${settings.support_role_id}>`,
        embeds: [ticketEmbed(ticket)],
        components: [ticketControls(ticket)],
        allowedMentions: { users: [interaction.user.id], roles: [settings.support_role_id] },
      });

      return { existingChannelId: null, ticket };
    } catch (error) {
      await channel.delete('Rolling back failed ticket creation').catch(() => undefined);
      throw error;
    }
  }

  async assertStaff(interaction: ButtonInteraction) {
    if (!interaction.guild || !(interaction.member instanceof Object)) return false;
    const settings = await this.guilds.find(interaction.guild.id);
    if (!settings) return false;
    return isSupport(interaction.member as GuildMember, settings.support_role_id);
  }

  get repositories() {
    return { guilds: this.guilds, tickets: this.tickets };
  }
}
