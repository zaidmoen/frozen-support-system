import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { Ticket } from '../types/ticket.js';

const statusLabel: Record<Ticket['status'], string> = {
  open: '🟢 Waiting for support',
  claimed: '🟡 In progress',
  waiting_user: '🔵 Waiting for member',
  waiting_staff: '🟣 Waiting for support reply',
  closed: '⚫ Closed',
};

export function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0x7dd3fc)
    .setTitle('🎫 Contact Support')
    .setDescription(
      'Open a private ticket to contact the **Frozen** support team.\n\n' +
      'Ask a question, report an issue, or request help from our team.\n\n' +
      '**Select the button below to get started.**',
    )
    .setFooter({ text: 'Frozen Support • Here to help' });
}

export function panelButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:open')
      .setLabel('Open a ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
  );
}

export function ticketEmbed(ticket: Ticket) {
  const owner = ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'Unassigned';

  return new EmbedBuilder()
    .setColor(ticket.status === 'closed' ? 0x64748b : 0x38bdf8)
    .setTitle(`🎫 Ticket #${String(ticket.ticket_number).padStart(4, '0')}`)
    .addFields(
      { name: '👤 Member', value: `<@${ticket.opener_id}>`, inline: true },
      { name: '👨‍💻 Assigned to', value: owner, inline: true },
      { name: '📍 Status', value: statusLabel[ticket.status], inline: true },
      { name: '📌 Subject', value: ticket.service_title },
      { name: '📝 Details', value: ticket.details },
    )
    .setTimestamp(ticket.created_at)
    .setFooter({ text: 'Frozen Support' });
}

export function ticketControls(ticket: Ticket) {
  const claimed = Boolean(ticket.claimed_by);
  const closed = ticket.status === 'closed';

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel(claimed ? 'Claimed' : 'Claim ticket')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(closed || claimed),
    new ButtonBuilder()
      .setCustomId('ticket:wait-user')
      .setLabel('Wait for member')
      .setEmoji('⏳')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(closed || !claimed),
    new ButtonBuilder()
      .setCustomId('ticket:wait-staff')
      .setLabel('Wait for support')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(closed || !claimed),
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Close')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(closed),
  );
}

export function closedEmbed(ticket: Ticket) {
  return new EmbedBuilder()
    .setColor(0x64748b)
    .setTitle('🔒 Ticket closed')
    .addFields(
      { name: '🎫 Ticket number', value: `#${String(ticket.ticket_number).padStart(4, '0')}`, inline: true },
      { name: '👤 Member', value: `<@${ticket.opener_id}>`, inline: true },
      { name: '👨‍💻 Staff member', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'Unassigned', inline: true },
      { name: '📌 Subject', value: ticket.service_title },
      { name: '📝 Resolution', value: ticket.close_reason ?? 'No reason provided' },
    )
    .setTimestamp();
}

export function ratingButtons(ticketId: string) {
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (let rating = 1; rating <= 5; rating += 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket:rate:${ticketId}:${rating}`)
        .setLabel('⭐'.repeat(rating))
        .setStyle(ButtonStyle.Secondary),
    );
  }
  return row;
}
