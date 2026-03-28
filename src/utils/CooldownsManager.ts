/* eslint-disable unicorn/filename-case -- class export */

import { Message } from 'discord.js';

import type { ChatInputCommandInteraction, MessageComponentInteraction } from 'discord.js';
import type { CommandType } from '../classes/utils.ts';
import type { Command, CooldownTypes } from '../index.ts';

export default class CooldownsManager {
  cache = new Map<string, Map<CooldownTypes, Map<Snowflake, number>>>();

  /** @returns milliseconds until the cooldown ends */
  update(
    name: string, context: ChatInputCommandInteraction | MessageComponentInteraction | Message,
    cooldowns: Partial<Command.Command<CommandType[], boolean>['cooldowns']>
  ): number {
    const
      createdAt = context.createdAt.getTime(),
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is safe */
      timeStamps = this.cache.get(name) ?? this.cache.set(name, new Map()).get(name)!,
      currentCooldowns = [];

    for (const [cdName, value] of Object.entries(cooldowns)) {
      if (!value) continue;

      let areaId: Snowflake | undefined;
      switch (cdName) {
        case 'user':
          areaId = context instanceof Message ? context.author.id : context.user.id;
          break;
        case 'guild':
          areaId = context.guildId ?? undefined;
          break;
        case 'channel':
          areaId = context.channelId;
          break;
      }

      if (!areaId) continue;

      const
        /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is safe */
        typeCache = timeStamps.get(cdName) ?? timeStamps.set(cdName, new Map()).get(cdName)!,
        timestamp = typeCache.get(areaId) ?? 0;

      if (timestamp > createdAt) currentCooldowns.push(timestamp - createdAt);
      else {
        typeCache.set(areaId, createdAt + value);

        setTimeout(() => {
          typeCache.delete(areaId);
          if (!typeCache.size) timeStamps.delete(cdName);
        }, value);
      }
    }

    return Math.max(0, ...currentCooldowns);
  }
}