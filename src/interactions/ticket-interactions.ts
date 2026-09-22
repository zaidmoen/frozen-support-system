import {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
} from 'discord.js';
import { TicketService } from '../services/ticket-service.js';
import { TranscriptService } from '../services/transcript-service.js';
import { closedEmbed, ratingButtons, ticketControls, ticketEmbed } from '../ui/ticket-ui.js';
import { db } from '../database/pool.js';

const service = new TicketService();
const transcriptService = new TranscriptService();

export async function handleTicketButton(interaction: ButtonInteraction) {
  if (interaction.customId === 'ticket:open') {
    const modal = new ModalBuilder().setCustomId('ticket:create').setTitle('فتح تذكرة جديدة');
    const title = new TextInputBuilder().setCustomId('service_title').setLabel('عنوان الخدمة').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true).setPlaceholder('مثال: استفسار عن الخادم');
    const details = new TextInputBuilder().setCustomId('details').setLabel('تفاصيل الطلب').setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(true).setPlaceholder('اكتب تفاصيل طلبك بشكل واضح...');
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(title), new ActionRowBuilder<TextInputBuilder>().addComponents(details));
    return interaction.showModal(modal);
  }

  if (interaction.customId.startsWith('ticket:rate:')) {
    const [, , ticketId, ratingRaw] = interaction.customId.split(':');
    const rating = Number(ratingRaw);
    const ticket = await service.repositories.tickets.findByChannel(interaction.channelId);
    if (!ticket || ticket.id !== ticketId || ticket.opener_id !== interaction.user.id) {
      return interaction.reply({ content: '❌ هذا التقييم ليس مخصصًا لك.', ephemeral: true });
    }
    await db.query(
      `insert into public.ticket_ratings (ticket_id, user_id, rating)
       values ($1, $2, $3)
       on conflict (ticket_id) do update set rating = excluded.rating, user_id = excluded.user_id, created_at = now()`,
      [ticket.id, interaction.user.id, rating],
    );
    return interaction.reply({ content: `شكراً لتقييمك ${'⭐'.repeat(rating)}`, ephemeral: true });
  }

  const ticket = await service.repositories.tickets.findByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ لم أجد بيانات هذه التذكرة.', ephemeral: true });
  if (!(await service.assertStaff(interaction))) return interaction.reply({ content: '❌ هذا الإجراء لفريق الدعم فقط.', ephemeral: true });

  if (interaction.customId === 'ticket:claim') {
    const updated = await service.repositories.tickets.claim(ticket.id, interaction.user.id);
    if (!updated) return interaction.reply({ content: '❌ تم استلام التذكرة من موظف آخر.', ephemeral: true });
    await interaction.update({ embeds: [ticketEmbed(updated)], components: [ticketControls(updated)] });
    return interaction.followUp({ content: `✅ تم استلام التذكرة بواسطة <@${interaction.user.id}>.` });
  }

  if (interaction.customId === 'ticket:wait-user' || interaction.customId === 'ticket:wait-staff') {
    const next = interaction.customId.endsWith('user') ? 'waiting_user' : 'waiting_staff';
    const updated = await service.repositories.tickets.setStatus(ticket.id, next, interaction.user.id);
    if (!updated) return interaction.reply({ content: '❌ تعذر تحديث الحالة.', ephemeral: true });
    return interaction.update({ embeds: [ticketEmbed(updated)], components: [ticketControls(updated)] });
  }

  if (interaction.customId === 'ticket:close') {
    const modal = new ModalBuilder().setCustomId('ticket:close-submit').setTitle('إغلاق التذكرة');
    const reason = new TextInputBuilder().setCustomId('reason').setLabel('سبب الإغلاق').setStyle(TextInputStyle.Paragraph).setMaxLength(500).setRequired(true).setPlaceholder('مثال: تمت الإجابة عن الاستفسار');
    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reason));
    return interaction.showModal(modal);
  }
}

export async function handleTicketModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId === 'ticket:create') {
    await interaction.deferReply({ ephemeral: true });
    const result = await service.open(
      interaction,
      interaction.fields.getTextInputValue('service_title').trim(),
      interaction.fields.getTextInputValue('details').trim(),
    );
    if (result.existingChannelId) return interaction.editReply(`لديك تذكرة مفتوحة بالفعل: <#${result.existingChannelId}>`);
    return interaction.editReply(`✅ تم فتح تذكرتك: <#${result.ticket!.channel_id}>`);
  }

  if (interaction.customId === 'ticket:close-submit') {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guild || !interaction.channel || !interaction.channel.isTextBased()) return;
    const ticket = await service.repositories.tickets.findByChannel(interaction.channelId);
    if (!ticket) return interaction.editReply('❌ لم أجد التذكرة.');
    const settings = await service.repositories.guilds.find(interaction.guild.id);
    if (!settings) return interaction.editReply('❌ إعدادات السيرفر غير موجودة.');

    const closed = await service.repositories.tickets.close(ticket.id, interaction.user.id, interaction.fields.getTextInputValue('reason').trim());
    if (!closed) return interaction.editReply('❌ التذكرة مغلقة بالفعل.');

    const channel = interaction.channel as TextChannel;
    await transcriptService.save(ticket.id, channel).catch(() => undefined);
    await channel.permissionOverwrites.edit(ticket.opener_id, { SendMessages: false });
    await channel.setName(`closed-${String(ticket.ticket_number).padStart(4, '0')}`).catch(() => undefined);
    await channel.send({ embeds: [closedEmbed(closed)], content: `<@${ticket.opener_id}> قيّم تجربتك مع فريق الدعم:`, components: [ratingButtons(ticket.id)] });

    const logChannel = await interaction.guild.channels.fetch(settings.log_channel_id).catch(() => null);
    if (logChannel?.isTextBased()) await logChannel.send({ embeds: [closedEmbed(closed)] });
    return interaction.editReply('✅ تم إغلاق التذكرة وحفظ السجل.');
  }
}
