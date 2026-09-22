export type TicketStatus = 'open' | 'claimed' | 'waiting_user' | 'waiting_staff' | 'closed';
export type TicketPriority = 'normal' | 'important' | 'urgent';

export interface GuildSettings {
  guild_id: string;
  panel_channel_id: string | null;
  ticket_category_id: string;
  support_role_id: string;
  log_channel_id: string;
  ticket_counter: number;
  inactivity_hours: number;
  allow_multiple_open: boolean;
}

export interface Ticket {
  id: string;
  guild_id: string;
  ticket_number: number;
  channel_id: string;
  opener_id: string;
  service_title: string;
  details: string;
  status: TicketStatus;
  priority: TicketPriority;
  claimed_by: string | null;
  claimed_at: Date | null;
  closed_at: Date | null;
  closed_by: string | null;
  close_reason: string | null;
  created_at: Date;
  updated_at: Date;
}
