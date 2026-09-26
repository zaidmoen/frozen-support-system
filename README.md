# Frozen Support System

An English-first Discord support system built with TypeScript, discord.js, and PostgreSQL. It combines private tickets, staff workflows, transcripts, feedback, and **Incident Radar**, a lightweight signal detector for bursts of similar reports.

## What makes it different

Most ticket systems treat every report as an isolated conversation. Incident Radar looks for a repeated issue across recent tickets from different members. When at least three members report a sufficiently similar issue within 20 minutes, it links the tickets, posts a notice in each affected ticket, and alerts the support role. Staff can resolve the incident from any linked ticket with `/incident resolve`.

Radar uses explainable keyword overlap and does not call an AI service. It is designed to surface a pattern for staff review; it does not decide that an outage is confirmed. The detector currently supports English text and may miss paraphrases or group unrelated reports that share terms.

## Features

- English ticket panel and request form.
- Configurable panel, ticket category, support role, and private logs channel.
- One open ticket per member by default.
- Atomic ticket numbering and safe staff claiming.
- Ticket states for open, claimed, waiting for a member, waiting for support, and closed.
- Required resolution summary, HTML transcript, audit log, and 1–5 star feedback.
- Incident Radar links repeated reports and notifies affected members and support staff.
- `/incident resolve` closes the active incident linked to the current ticket and updates the linked tickets.
- Multi-server database design with PostgreSQL row-level security enabled.

## Stack

- Node.js and TypeScript
- discord.js
- PostgreSQL / Supabase
- `pg`, Pino, and Zod

## Run locally

### Requirements

- Node.js 20 or newer
- A Discord application with a bot
- A Supabase PostgreSQL database

### Install and configure

```bash
npm install
cp .env.example .env
```

Set these values in `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_server_id
DATABASE_URL=your_supabase_postgres_connection_string
NODE_ENV=development
```

Never commit `.env` or share a bot token. If your network is IPv4-only, use the Supabase Session Pooler connection string.

### Set up the database

Run both SQL files, in order, in the Supabase SQL Editor:

1. `supabase/migrations/0001_initial_ticket_system.sql`
2. `supabase/migrations/0002_incident_radar.sql`

Incident Radar stores filtered English keywords for up to 30 days to compare reports. It does not store ticket text in its signal table. Ticket details and transcripts continue to follow the existing ticket storage and retention practices.

### Start the bot

```bash
npm run check
npm run deploy:commands
npm run dev
```

In the server, run `/ticket-setup` and select the panel channel, ticket category, support role, and private log channel. The bot does not need the Administrator permission. Grant the required channel and message permissions listed below.

## Incident Radar behavior

1. When a ticket opens, the detector extracts common English keywords from its subject and details. URLs, numbers, and common filler words are excluded.
2. It compares those terms with open tickets created in the previous 20 minutes.
3. Similarity requires at least two shared terms and a Jaccard overlap of at least 0.30. Only one earlier ticket per member is counted.
4. Three reports from different members create an incident. The bot links the tickets and posts a notice in their private channels.
5. Support staff can run `/incident resolve` from any linked ticket. The bot closes the incident and posts a resolution notice in every linked channel.

The detector is deliberately conservative and transparent, but it can still produce false matches. Staff should review the linked tickets before treating a signal as a confirmed service issue.

## Discord permissions

The bot needs:

- View Channels
- Manage Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History

Invite scopes: `bot` and `applications.commands`. Message Content intent is enabled for transcript generation; enable it in the Discord Developer Portal as well.

## Project layout

```text
src/
├── commands/       # Slash commands
├── config/         # Environment and logging
├── database/       # PostgreSQL repositories
├── events/         # Discord event routing
├── interactions/   # Ticket buttons and forms
├── services/       # Ticket, transcript, and incident logic
├── types/          # Shared TypeScript types
├── ui/             # Embeds and buttons
└── utils/          # Permission helpers

supabase/migrations/ # Database schema changes
```

## Scripts

```bash
npm run dev             # Run with file watching
npm run check           # Type-check without emitting files
npm run build           # Compile to dist/
npm run start           # Run the compiled bot
npm run deploy:commands # Register slash commands
```

---

Built for Frozen Support.
