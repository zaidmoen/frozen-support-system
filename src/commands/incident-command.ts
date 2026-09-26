import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { TicketRepository } from '../database/ticket-repository.js';
import { GuildRepository } from '../database/guild-repository.js';
import { IncidentRadar } from '../services/incident-radar.js';
import { isSupport } from '../utils/permissions.js';

const tickets = new TicketRepository();
const guilds = new GuildRepository();
const radar = new IncidentRadar();

export const incidentCommand = {
  data: new SlashCommandBuilder()
    .setName('incident')
    .setDescription('Manage a service incident from a linked ticket')
    .addSubcommand((subcommand) => subcommand
      .setName('resolve')
      .setDescription('Resolve the incident linked to this ticket')),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.channel) return;
    const settings = await guilds.find(interaction.guild.id);
    if (!settings) {
      await interaction.reply({ content: 'Support is not configured for this server.', ephemeral: true });
      return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isSupport(member, settings.support_role_id)) {
      await interaction.reply({ content: 'This command is for support staff only.', ephemeral: true });
      return;
    }

    const ticket = await tickets.findByChannel(interaction.channel.id);
    if (!ticket) {
      await interaction.reply({ content: 'Run this command from a ticket linked to the incident.', ephemeral: true });
      return;
    }

    const affectedTickets = await radar.resolveForTicket(ticket.id, interaction.guild.id);
    if (affectedTickets.length === 0) {
      await interaction.reply({ content: 'No open incident is linked to this ticket.', ephemeral: true });
      return;
    }

    await interaction.reply({ content: `✅ Incident resolved. ${affectedTickets.length} linked tickets have been updated.` });
    for (const affected of affectedTickets) {
      const channel = await interaction.guild.channels.fetch(affected.channel_id).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send({ content: '✅ **Incident resolved** — support staff confirmed that the issue has been addressed.' }).catch(() => undefined);
      }
    }
  },
};
