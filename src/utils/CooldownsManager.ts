/* eslint-disable unicorn/filename-case -- class export */

import { Message } from 'discord.js';
import type { BaseInteraction } from 'discord.js';
import type { Command, CommandType, CooldownTypes } from '../index.ts';

export default class CooldownsManager {
  cache = new Map<string, Map<CooldownTypes, Map<Snowflake, number>>>();

  /** @returns milliseconds until the cooldown ends */
  update(
    name: string, context: BaseInteraction | Message,
    cooldowns: Partial<Command.Command<CommandType[], boolean>['cooldowns']>
  ): number {
    const
      createdAt = context.createdAt.getTime(),
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this is safe */
      timeStamps = this.cache.get(name) ?? this.cache.set(name, new Map()).get(name)!,
      currentCooldowns = [];

    for (const [cdName, value] of Object.entries(cooldowns)) {
      if (!value) continue;

      let areaId;
      /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
      if (context instanceof Message) areaId = context[cdName == 'user' ? 'author' : cdName]?.id as Snowflake | undefined;
      else areaId = context[cdName]?.id as Snowflake | undefined;
      /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */

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