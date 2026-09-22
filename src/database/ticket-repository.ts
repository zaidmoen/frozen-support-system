import { db } from './pool.js';
import type { Ticket, TicketStatus } from '../types/ticket.js';

export class TicketRepository {
  async findOpenByUser(guildId: string, userId: string) {
    const result = await db.query<Ticket>(
      `select * from public.tickets
       where guild_id = $1 and opener_id = $2 and status <> 'closed'
       order by created_at desc limit 1`,
      [guildId, userId],
    );
    return result.rows[0] ?? null;
  }

  async create(input: { guildId: string; channelId: string; openerId: string; serviceTitle: string; details: string }) {
    const client = await db.connect();
    try {
      await client.query('begin');
      const settings = await client.query<{ ticket_counter: number }>(
        `update public.guild_settings
         set ticket_counter = ticket_counter + 1, updated_at = now()
         where guild_id = $1
         returning ticket_counter`,
        [input.guildId],
      );
      if (!settings.rows[0]) throw new Error('Guild is not configured');

      const result = await client.query<Ticket>(
        `insert into public.tickets
          (guild_id, ticket_number, channel_id, opener_id, service_title, details)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [input.guildId, settings.rows[0].ticket_counter, input.channelId, input.openerId, input.serviceTitle, input.details],
      );
      await client.query(
        `insert into public.ticket_events (ticket_id, event_type, actor_id)
         values ($1, 'opened', $2)`,
        [result.rows[0]!.id, input.openerId],
      );
      await client.query('commit');
      return result.rows[0]!;
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async findByChannel(channelId: string) {
    const result = await db.query<Ticket>('select * from public.tickets where channel_id = $1', [channelId]);
    return result.rows[0] ?? null;
  }

  async claim(ticketId: string, staffId: string) {
    const result = await db.query<Ticket>(
      `update public.tickets
       set claimed_by = $2, claimed_at = coalesce(claimed_at, now()), status = 'claimed', updated_at = now()
       where id = $1 and status <> 'closed' and (claimed_by is null or claimed_by = $2)
       returning *`,
      [ticketId, staffId],
    );
    if (!result.rows[0]) return null;
    await this.addEvent(ticketId, 'claimed', staffId);
    return result.rows[0];
  }

  async setStatus(ticketId: string, status: TicketStatus, actorId: string) {
    const result = await db.query<Ticket>(
      `update public.tickets set status = $2, updated_at = now(), last_activity_at = now()
       where id = $1 and status <> 'closed' returning *`,
      [ticketId, status],
    );
    if (result.rows[0]) await this.addEvent(ticketId, `status:${status}`, actorId);
    return result.rows[0] ?? null;
  }

  async close(ticketId: string, actorId: string, reason: string) {
    const result = await db.query<Ticket>(
      `update public.tickets
       set status = 'closed', closed_at = now(), closed_by = $2, close_reason = $3, updated_at = now()
       where id = $1 and status <> 'closed' returning *`,
      [ticketId, actorId, reason],
    );
    if (result.rows[0]) await this.addEvent(ticketId, 'closed', actorId, { reason });
    return result.rows[0] ?? null;
  }

  async addEvent(ticketId: string, eventType: string, actorId: string | null, payload: Record<string, unknown> = {}) {
    await db.query(
      `insert into public.ticket_events (ticket_id, event_type, actor_id, payload)
       values ($1, $2, $3, $4::jsonb)`,
      [ticketId, eventType, actorId, JSON.stringify(payload)],
    );
  }
}
