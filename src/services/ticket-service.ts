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
import { IncidentRadar } from './incident-radar.js';
import { logger } from '../config/logger.js';

export class TicketService {
  private readonly incidentRadar = new IncidentRadar();
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

      let incident = null;
      try {
        incident = await this.incidentRadar.record(ticket);
      } catch (error) {
        logger.error({ err: error, ticketId: ticket.id }, 'Incident Radar could not analyze a new ticket');
      }

      await channel.setName(`ticket-${String(ticket.ticket_number).padStart(4, '0')}`);
      await channel.send({
        content: `<@${interaction.user.id}> <@&${settings.support_role_id}>`,
        embeds: [ticketEmbed(ticket)],
        components: [ticketControls(ticket)],
        allowedMentions: { users: [interaction.user.id], roles: [settings.support_role_id] },
      });

      if (incident) {
        const incidentMessage = incident.created
          ? `🚨 **Possible service incident detected**\nThis report matches ${incident.ticketCount - 1} recent tickets from different members. <@&${settings.support_role_id}> is reviewing the pattern. Related tickets: ${incident.relatedChannelIds.map((id) => `<#${id}>`).join(', ')}`
          : `🔎 **This ticket is linked to a possible incident**\n${incident.ticketCount} reports from different members share a similar subject. Staff are reviewing the pattern. <@&${settings.support_role_id}>`;
        await channel.send({
          content: incidentMessage,
          allowedMentions: { roles: [settings.support_role_id] },
        });
        if (incident.created) {
          for (const channelId of incident.relatedChannelIds) {
            const relatedChannel = await interaction.guild.channels.fetch(channelId).catch(() => null);
            if (relatedChannel?.isTextBased()) {
              await relatedChannel.send({
                content: `🚨 **Possible service incident detected**\nYour report has been linked with similar reports from other members. Support staff are reviewing the pattern.`,
                allowedMentions: { parse: [] },
              }).catch((error) => logger.warn({ err: error, channelId }, 'Could not post incident update to a related ticket'));
            }
          }
        }
      }

      return { existingChannelId: null, ticket, incident };
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
