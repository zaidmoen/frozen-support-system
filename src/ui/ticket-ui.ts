import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import type { Ticket } from '../types/ticket.js';

const statusLabel: Record<Ticket['status'], string> = {
  open: '🟢 بانتظار فريق الدعم',
  claimed: '🟡 قيد المعالجة',
  waiting_user: '🔵 بانتظار رد العضو',
  waiting_staff: '🟣 بانتظار رد الدعم',
  closed: '⚫ مغلقة',
};

export function panelEmbed() {
  return new EmbedBuilder()
    .setColor(0x7dd3fc)
    .setTitle('🎫 التواصل مع الدعم الفني')
    .setDescription(
      'يمكنك فتح تذكرة للتواصل مع فريق الدعم الفني الخاص بخادم **فروزين**.\n\n' +
      'يمكنك من خلال هذه التذكرة الاستفسار عن أي معلومة تخص الخادم، الإبلاغ عن مشكلة، أو طلب المساعدة من فريق الدعم.\n\n' +
      '**اضغط على الزر أدناه لفتح تذكرتك.**',
    )
    .setFooter({ text: 'Frozen Support • نحن هنا لمساعدتك' });
}

export function panelButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:open')
      .setLabel('فتح تذكرة')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary),
  );
}

export function ticketEmbed(ticket: Ticket) {
  const owner = ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'لم يتم استلام التذكرة بعد';

  return new EmbedBuilder()
    .setColor(ticket.status === 'closed' ? 0x64748b : 0x38bdf8)
    .setTitle(`🎫 تذكرة #${String(ticket.ticket_number).padStart(4, '0')}`)
    .addFields(
      { name: '👤 صاحب التذكرة', value: `<@${ticket.opener_id}>`, inline: true },
      { name: '👨‍💻 المسؤول', value: owner, inline: true },
      { name: '📍 الحالة', value: statusLabel[ticket.status], inline: true },
      { name: '📌 عنوان الخدمة', value: ticket.service_title },
      { name: '📝 تفاصيل الطلب', value: ticket.details },
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
      .setLabel(claimed ? 'تم الاستلام' : 'استلام التذكرة')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(closed || claimed),
    new ButtonBuilder()
      .setCustomId('ticket:wait-user')
      .setLabel('انتظار العضو')
      .setEmoji('⏳')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(closed || !claimed),
    new ButtonBuilder()
      .setCustomId('ticket:wait-staff')
      .setLabel('انتظار الدعم')
      .setEmoji('💬')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(closed || !claimed),
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('إغلاق')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(closed),
  );
}

export function closedEmbed(ticket: Ticket) {
  return new EmbedBuilder()
    .setColor(0x64748b)
    .setTitle('🔒 تم إغلاق التذكرة')
    .addFields(
      { name: '🎫 رقم التذكرة', value: `#${String(ticket.ticket_number).padStart(4, '0')}`, inline: true },
      { name: '👤 العضو', value: `<@${ticket.opener_id}>`, inline: true },
      { name: '👨‍💻 المسؤول', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'غير محدد', inline: true },
      { name: '📌 عنوان الخدمة', value: ticket.service_title },
      { name: '📝 سبب الإغلاق', value: ticket.close_reason ?? 'لم يتم تحديد سبب' },
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
