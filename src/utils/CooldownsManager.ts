/* eslint-disable unicorn/filename-case -- class export */

import { Message as _Message } from 'discord.js';
import { CooldownType } from '../index.ts';

import type { CommandType } from '../classes/utils.ts';
import type { ChatInputCommandInteraction, Command, Message, MessageComponentInteraction } from '../index.ts';

export default class CooldownsManager {
  cache = new Map<string, Map<CooldownType, Map<Snowflake, number>>>();

  /** @returns milliseconds until the cooldown ends */
  update(
    name: string, context: ChatInputCommandInteraction | MessageComponentInteraction | Message,
    cooldowns: Partial<Command<CommandType[], boolean>['cooldowns']>
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
        case CooldownType.User:
          areaId = context instanceof _Message ? context.author.id : context.user.id;
          break;
        case CooldownType.Guild:
          areaId = context.guildId ?? undefined;
          break;
        case CooldownType.Channel:
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