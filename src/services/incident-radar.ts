import { db } from '../database/pool.js';
import type { Ticket } from '../types/ticket.js';

const WINDOW_MINUTES = 20;
const MIN_SHARED_TERMS = 2;
const SIMILARITY_THRESHOLD = 0.3;
const ignoredTerms = new Set([
  'about', 'after', 'again', 'also', 'been', 'could', 'does', 'from', 'have',
  'help', 'into', 'just', 'more', 'need', 'please', 'that', 'them', 'there',
  'they', 'this', 'ticket', 'with', 'would', 'your', 'when', 'what', 'where',
]);

interface SignalRow {
  ticket_id: string;
  channel_id: string;
  ticket_number: number;
  opener_id: string;
  terms: string[];
}

interface RadarResult {
  incidentId: string;
  ticketCount: number;
  relatedChannelIds: string[];
  created: boolean;
}

function extractTerms(ticket: Ticket) {
  return [...new Set(`${ticket.service_title} ${ticket.details}`
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .match(/[a-z]{3,}/g) ?? [])]
    .filter((term) => !ignoredTerms.has(term))
    .slice(0, 40);
}

function isRelated(left: string[], right: string[]) {
  const rightSet = new Set(right);
  const shared = left.filter((term) => rightSet.has(term)).length;
  const unionSize = new Set([...left, ...right]).size;
  return shared >= MIN_SHARED_TERMS && shared / Math.max(unionSize, 1) >= SIMILARITY_THRESHOLD;
}

export class IncidentRadar {
  async record(ticket: Ticket): Promise<RadarResult | null> {
    const terms = extractTerms(ticket);
    if (terms.length < MIN_SHARED_TERMS) return null;

    const client = await db.connect();
    try {
      await client.query('begin');
      // Serialize detection per server so two simultaneous tickets cannot open duplicate incidents.
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [ticket.guild_id]);
      await client.query("delete from public.support_signals where created_at < now() - interval '30 days'");
      await client.query(
        `insert into public.support_signals (ticket_id, guild_id, terms)
         values ($1, $2, $3)
         on conflict (ticket_id) do nothing`,
        [ticket.id, ticket.guild_id, terms],
      );

      const recent = await client.query<SignalRow>(
        `select s.ticket_id, t.channel_id, t.ticket_number, t.opener_id, s.terms
         from public.support_signals s
         join public.tickets t on t.id = s.ticket_id
         where s.guild_id = $1 and s.ticket_id <> $2
           and s.created_at >= now() - ($3::int * interval '1 minute')
           and t.status <> 'closed'
         order by s.created_at desc limit 200`,
        [ticket.guild_id, ticket.id, WINDOW_MINUTES],
      );

      // Keep one report per member in a cluster to avoid a single user inflating the signal.
      const relatedByMember = new Map<string, SignalRow>();
      for (const row of recent.rows) {
        if (row.opener_id === ticket.opener_id || relatedByMember.has(row.opener_id)) continue;
        if (isRelated(terms, row.terms)) relatedByMember.set(row.opener_id, row);
      }
      const related = [...relatedByMember.values()];
      if (related.length < 2) {
        await client.query('commit');
        return null;
      }

      const matchedTicketIds = related.map((row) => row.ticket_id);
      const activeIncident = await client.query<{ id: string }>(
        `select i.id from public.support_incidents i
         join public.support_incident_tickets it on it.incident_id = i.id
         where i.guild_id = $1 and i.status = 'open' and it.ticket_id = any($2::uuid[])
         order by i.created_at desc limit 1`,
        [ticket.guild_id, matchedTicketIds],
      );

      let incidentId = activeIncident.rows[0]?.id;
      let created = false;
      if (!incidentId) {
        const incident = await client.query<{ id: string }>(
          `insert into public.support_incidents (guild_id, title, status)
           values ($1, $2, 'open') returning id`,
          [ticket.guild_id, ticket.service_title.slice(0, 120)],
        );
        incidentId = incident.rows[0]!.id;
        created = true;
      }

      const ticketIds = [...matchedTicketIds, ticket.id];
      await client.query(
        `insert into public.support_incident_tickets (incident_id, ticket_id)
         select $1, linked.ticket_id from unnest($2::uuid[]) as linked(ticket_id)
         on conflict (ticket_id) do nothing`,
        [incidentId, ticketIds],
      );
      const counts = await client.query<{ ticket_count: string }>(
        'select count(*)::text as ticket_count from public.support_incident_tickets where incident_id = $1',
        [incidentId],
      );
      await client.query(
        'update public.support_incidents set ticket_count = $2, updated_at = now() where id = $1',
        [incidentId, Number(counts.rows[0]!.ticket_count)],
      );
      await client.query('commit');

      return {
        incidentId,
        ticketCount: Number(counts.rows[0]!.ticket_count),
        relatedChannelIds: related.map((row) => row.channel_id),
        created,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async resolveForTicket(ticketId: string, guildId: string) {
    const result = await db.query<{ incident_id: string; channel_id: string }>(
      `with target as (
         select i.id
         from public.support_incident_tickets it
         join public.support_incidents i on i.id = it.incident_id
         where it.ticket_id = $1 and i.guild_id = $2 and i.status = 'open'
         limit 1
       ), resolved as (
         update public.support_incidents
         set status = 'resolved', resolved_at = now(), updated_at = now()
         where id = (select id from target)
         returning id
       )
       select resolved.id as incident_id, t.channel_id
       from resolved
       join public.support_incident_tickets it on it.incident_id = resolved.id
       join public.tickets t on t.id = it.ticket_id`,
      [ticketId, guildId],
    );
    return result.rows;
  }
}
