/** @import {CooldownsManager as CooldownsManagerT} from '.' */

const { Message } = require('discord.js');

module.exports = class CooldownsManager {
  /** @type {CooldownsManagerT['cache']} */
  cache = new Map();

  /** @type {CooldownsManagerT['update']} */
  update(name, context, cooldowns) {
    const
      createdAt = context.createdAt.getTime(),
      timeStamps = this.cache.get(name) ?? this.cache.set(name, new Map()).get(name),
      currentCooldowns = [];

    for (const [cdName, value] of Object.entries(cooldowns)) {
      if (!value) continue;

      /* eslint-disable-next-line sonarjs/no-nested-conditional -- required for typing */
      const areaId = (context instanceof Message ? context[cdName === 'user' ? 'author' : cdName] : context[cdName])?.id;
      if (!areaId) continue;

      const
        typeCache = timeStamps.get(cdName) ?? timeStamps.set(cdName, new Map()).get(cdName),
        timestamp = typeCache.get(areaId) ?? 0;

      if (timestamp > createdAt) currentCooldowns.push(timestamp - createdAt);
      else typeCache.set(areaId, createdAt + value);
    }

    return Math.max(0, ...currentCooldowns);
  }
};