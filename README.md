# Frozen Support System ❄️

A modern Arabic Discord support and ticket system for **Frozen**, built with TypeScript, discord.js, and Supabase PostgreSQL.

## Features

- Arabic ticket panel with a clean member experience.
- Ticket creation modal using **عنوان الخدمة** and **تفاصيل الطلب**.
- Configurable panel channel, ticket category, support role, and logs channel through `/ticket-setup`.
- One-open-ticket-per-member protection by default.
- Safe ticket claiming so two staff members cannot claim the same ticket.
- Ticket states: open, claimed, waiting for member, waiting for support, and closed.
- Required close reason.
- HTML transcript generation and database storage.
- 1–5 star support rating after closing.
- Ticket audit events and support logs.
- Atomic ticket numbering with PostgreSQL transactions.
- Multi-guild database design.

## Stack

- Node.js
- TypeScript
- discord.js
- PostgreSQL
- Supabase
- Pino
- Zod

## Project Structure

```text
src/
├── commands/          # Slash commands
├── config/            # Environment and logger configuration
├── database/          # PostgreSQL repositories and pool
├── events/            # Discord event handlers
├── interactions/      # Buttons and modal handlers
├── services/          # Ticket and transcript business logic
├── types/             # Shared TypeScript types
├── ui/                # Embeds and Discord components
└── utils/             # Permission helpers

supabase/
└── migrations/        # Database schema
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your own values:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_server_id
DATABASE_URL=your_supabase_postgres_connection_string
NODE_ENV=development
```

Never commit `.env` or any real secrets.

> **Supabase note:** the direct database endpoint is IPv6 by default. If your local network is IPv4-only, use the **Session Pooler** connection string from Supabase `Connect` instead of the direct `db.<project-ref>.supabase.co` endpoint.

### 3. Create the database schema

Run the SQL migration in:

```text
supabase/migrations/0001_initial_ticket_system.sql
```

The schema enables RLS on the public tables. The bot itself connects from the trusted backend through PostgreSQL.

### 4. Deploy slash commands

```bash
npm run deploy:commands
```

### 5. Start development mode

```bash
npm run dev
```

### 6. Configure the Discord server

Run:

```text
/ticket-setup
```

Choose:

- `panel` — channel that contains the ticket panel.
- `category` — category where new ticket channels are created.
- `support` — support staff role.
- `logs` — private ticket log channel.

## Discord Bot Permissions

Recommended bot permissions:

- View Channels
- Manage Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History

OAuth2 scopes:

- `bot`
- `applications.commands`

The project does not require the `Administrator` permission.

## Scripts

```bash
npm run dev             # Run with watch mode
npm run check           # TypeScript type check
npm run build           # Build to dist/
npm run start           # Run the compiled build
npm run deploy:commands # Register guild slash commands
```

## Security

- `.env` is ignored by Git.
- Never commit Discord tokens or database passwords.
- Rotate a secret immediately if it is exposed.
- Keep support logs and transcript access restricted to trusted staff.

## Current Ticket Flow

```text
Open Ticket
    ↓
Service Title + Request Details
    ↓
Open / Waiting for Support
    ↓
Claimed by Staff
    ↓
Waiting for Member / Waiting for Support
    ↓
Close with Reason
    ↓
Transcript + Logs + Rating
```

---

Built for Frozen Support.
