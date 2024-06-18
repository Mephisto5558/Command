const { resolve, dirname, basename } = require('node:path');

function getCallerFilePath() {
  /* eslint-disable-next-line unicorn/error-message */
  const stack = new Error().stack.split('\n');

  return stack[2].slice(
    stack[2].lastIndexOf('(') + 1,
    stack[2].lastIndexOf('.js') + 3
  );
}

/**
 * @typedef {import('.').BaseCommand}BaseCommand
 * @typedef {import('.').CommandOptions}CommandOptions*/

/** @type {BaseCommand} */
class BaseCommand {
  // Thanks to this I have types in the constructor
  name; category; description; descriptionLocalizations; type; filePath;
  cooldowns; permissions; defaultMemberPermissions;
  prefixCommand; slashCommand; dmPermission; disabled;
  disabledReason; options; beta; run;

  /** @param {import('.').BaseCommandInitOptions}options*/
  constructor({
    name, description,
    aliases = {}, usage = {},
    permissions = { }, cooldowns = { },
    dmPermission = false,
    disabled = false, disabledReason,
    options = [],
    beta = false,
    filePath = getCallerFilePath(),
    run
  } = {}) {
    this.filePath = resolve(filePath);
    this.name = (name ?? basename(this.filePath)).toLowerCase();
    this.nameLocalizations = undefined;
    this.category = basename(dirname(this.filePath));
    this.description = description;
    this.descriptionLocalizations = undefined;
    this.aliases = aliases;
    this.usage = usage;
    this.permissions = permissions;
    this.cooldowns = {
      guild: Math.max(cooldowns.guild ?? 0, 0),
      channel: Math.max(cooldowns.channel ?? 0, 0),
      user: Math.max(cooldowns.user ?? 0, 0)
    };
    this.slashCommand = undefined;
    this.prefixCommand = undefined;
    this.dmPermission = dmPermission;
    this.disabled = disabled;
    this.disabledReason = disabledReason;
    this.options = options;
    this.beta = beta;
    this.run = run;

    this.#validateData();
    this.localize();
  }

  #validateData() {

  }
}

class SlashCommand extends BaseCommand {

}

class PrefixCommand extends BaseCommand {
  constructor() {
    super();

    this.slashCommand = true;
    this.prefixCommand = false;
  }
}

class CommandOptions {

}

module.exports = { BaseCommand, SlashCommand, PrefixCommand, CommandOptions };