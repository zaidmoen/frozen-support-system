import type { TextChannel } from 'discord.js';
import { db } from '../database/pool.js';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export class TranscriptService {
  async save(ticketId: string, channel: TextChannel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const ordered = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const rows = ordered.map((message) => {
      const time = new Date(message.createdTimestamp).toLocaleString('ar');
      return `<article><strong>${escapeHtml(message.author.tag)}</strong><small>${escapeHtml(time)}</small><p>${escapeHtml(message.content || '[Message has no text]')}</p></article>`;
    }).join('\n');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Frozen Ticket Transcript</title><style>body{font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;max-width:900px;margin:auto;padding:32px}article{background:#1e293b;border-radius:12px;padding:14px 18px;margin:10px 0}strong{display:block;color:#7dd3fc}small{color:#94a3b8}p{white-space:pre-wrap;line-height:1.6}</style></head><body><h1>Frozen Support Transcript</h1>${rows}</body></html>`;

    await db.query(
      `insert into public.ticket_transcripts (ticket_id, html, message_count)
       values ($1, $2, $3)
       on conflict (ticket_id) do update set html = excluded.html, message_count = excluded.message_count, created_at = now()`,
      [ticketId, html, ordered.length],
    );

    return { html, count: ordered.length };
  }
}
