/**
 * @import { getMilliseconds as getMS, CommandExecutionError as CommandExecutionErrorT } from '..'
 * @import { Command as CommandT, CommandConfig } from './command' */

/** @type {getMS} *//* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
const getMilliseconds = require('better-ms').ms;

/**
 * @param {unknown} a
 * @param {unknown} b */
module.exports.equal = function equal(a, b) {
  if (a === b) return true;

  if (!a?.toString() && !b?.toString()) return true;
  if (typeof a == 'string' || typeof b == 'string') return a == b;
  if (a == undefined && !b?.__count__ || b == undefined && !a?.__count__) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const
    keysA = Object.keys(a),
    keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;
  for (const key of keysA)
    if (!equal(a[key], b[key])) return false;

  return true;
};

/**
 * @param {NonNullable<CommandConfig['cooldowns']>} cooldown
 * @param {keyof CommandT['cooldowns']} k
 * @param {CommandT['cooldowns'][keyof CommandT['cooldowns']]} v
 * @returns {NonNullable<CommandT['cooldowns']>}
 * @throws {TypeError} on invalid time string */
module.exports.cooldownConverter = function cooldownConverter(cooldown, k, v) {
  if (!cooldown[k]) return [k, v];

  const ms = getMilliseconds(cooldown[k]);
  if (typeof ms != 'number') throw new TypeError(`Could not convert time string cooldowns.${k} "${cooldown[k]}" to milliseconds.`);

  return [k, ms];
};

module.exports.CommandExecutionError = class CommandExecutionError extends Error {
  name = 'CommandExecutionError';

  /**
   * @param {string | undefined} message
   * @param {CommandExecutionErrorT['interaction']} interaction
   * @param {CommandExecutionErrorT['translator']} translator
   * @param {ErrorOptions | undefined} options */
  constructor(message, interaction, translator, options) {
    super(message, options);

    this.interaction = interaction;
    this.translator = translator;
  }
};

module.exports.commandTypes = Object.freeze({
  slash: 'slash',
  prefix: 'prefix'
});