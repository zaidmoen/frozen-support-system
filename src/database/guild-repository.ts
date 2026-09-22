import { db } from './pool.js';
import type { GuildSettings } from '../types/ticket.js';

export class GuildRepository {
  async upsert(input: Omit<GuildSettings, 'ticket_counter' | 'inactivity_hours' | 'allow_multiple_open'>) {
    const result = await db.query<GuildSettings>(
      `insert into public.guild_settings
        (guild_id, panel_channel_id, ticket_category_id, support_role_id, log_channel_id)
       values ($1, $2, $3, $4, $5)
       on conflict (guild_id) do update set
         panel_channel_id = excluded.panel_channel_id,
         ticket_category_id = excluded.ticket_category_id,
         support_role_id = excluded.support_role_id,
         log_channel_id = excluded.log_channel_id,
         updated_at = now()
       returning *`,
      [input.guild_id, input.panel_channel_id, input.ticket_category_id, input.support_role_id, input.log_channel_id],
    );
    return result.rows[0]!;
  }

  async find(guildId: string) {
    const result = await db.query<GuildSettings>('select * from public.guild_settings where guild_id = $1', [guildId]);
    return result.rows[0] ?? null;
  }
}
