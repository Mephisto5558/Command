import { resolve, dirname, basename } from 'node:path';

/**
 * @typedef {import('.').BaseCommand}BaseCommand
 * @typedef {import('.').CommandOptions}CommandOptions
 */

class BaseCommand {
  /**
   * @param {object}config
   * @param {Lowercase<string>|undefined}config.name
   * @param {string|undefined}config.description
   * @param {{ slash?: Lowercase<string>, prefix?: Lowercase<string> }|undefined}config.aliases
   * @param {{ usage?: string, examples?: string }|undefined}config.usage
   * @param {{
   * client?: (keyof import('discord.js').PermissionFlags)[],
   * user?: (keyof import('discord.js').PermissionFlags)[]
   * }|undefined}config.permissions
   * @param {{ guild?: number, channel?: number, user?: number }|undefined}config.cooldowns
   * @param {boolean|undefined}config.dmPermission
   * @param {boolean|undefined}config.disabled
   * @param {string|undefined}config.disabledReason
   * @param {CommandOptions[]|undefined}config.options
   * @param {boolean|undefined}config.beta
   * @param {string}config.filePath
   * @param {(this: import('discord.js').ChatInputCommandInteraction | import('discord.js').Message, lang: import('.').lang, client: import('discord.js').Client<true>) => Promise<never>}config.run*/
  constructor({
    name, description,
    aliases = {}, usage = {},
    permissions: { client = [], slash = [] } = { client: [], slash: [] },
    cooldowns: { guild = 0, channel = 0, user = 0 } = { guild: 0, channel: 0, user: 0 },
    dmPermission = false,
    disabled = false,
    disabledReason,
    options = [],
    beta = false,
    filePath,
    run
  } = {}) {
    const path = resolve(filePath);

    this.name = (name ?? basename(path)).toLowerCase();
    this.description = description;
    this.category = basename(dirname(path));
    this.aliases = aliases;
    this.usage = usage;
    this.permissions = { client, slash };
    this.cooldowns = { guild, channel, user };
    this.dmPermission = dmPermission;
    this.disabled = disabled;
    this.disabledReason = disabledReason;
    this.options = options;
    this.beta = beta;
    this.filePath = path;

    this.run = run;
  }
}

export default { BaseCommand };