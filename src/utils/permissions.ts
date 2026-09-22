import type { GuildMember } from 'discord.js';

export function isSupport(member: GuildMember, supportRoleId: string) {
  return member.roles.cache.has(supportRoleId) || member.permissions.has('Administrator');
}
