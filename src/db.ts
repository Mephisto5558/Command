import type { Channel, Guild, Role, User } from 'discord.js';
import type { CommandType } from './classes/utils.ts';
import type { Command } from './index.ts';

export type Database = {
  botSettings: {
    cmdStats: Record<Command['name'], {
      createdAt?: Date;
    } & Partial<Record<CommandType, number>>>;
  };
  guildSettings: Record<Guild['id'], {
    config: {
      commands?: Record<Command['name'], {
        disabled?: {
          users: (User['id'] | '*')[];
          channels: (Channel['id'] | '*')[];
          roles: (Role['id'] | '*')[];
        };
      }>;
    };
  }>;
};