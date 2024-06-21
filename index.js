const { ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
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
 * {@link https://stackoverflow.com/a/61860802/17580213 Source}
 * @param {Function[]}bases class*/
function classes(...bases) {
  class Bases {
    constructor() {
      for (const Base of bases) Object.assign(this, new Base());
    }
  }

  for (const Base of bases) {
    for (const prop of Object.getOwnPropertyNames(Base.prototype))
      if (prop != 'constructor') Bases.prototype[prop] = Base.prototype[prop];
  }

  return Bases;
}

/**
 * @typedef {import('.').BaseCommand}BaseCommand
 * @typedef {import('.').CommandOptions}CommandOptions*/

class BaseCommand {
  // Thanks to this I have types in the constructor
  name; category; description; descriptionLocalizations; type; filePath;
  cooldowns; permissions; defaultMemberPermissions;
  prefixCommand; slashCommand; dmPermission; disabled;
  disabledReason; options; beta; run;

  /** @param {import('.').BaseCommandInitOptions}options*/
  constructor(options = {}) {
    this.filePath = resolve(options.filePath ?? getCallerFilePath());
    this.name = (options.name ?? basename(this.filePath)).toLowerCase(); // NOSONAR
    this.nameLocalizations = undefined;
    this.category = basename(dirname(this.filePath));
    this.description = options.description; // NOSONAR
    this.descriptionLocalizations = undefined;
    this.aliases = options.aliases ?? {};
    this.usage = options.usage ?? {};
    this.permissions = {
      client: new Set(options.permissions?.client?.map(e => typeof e == 'string' ? PermissionFlagsBits[e] : e)),
      user: new Set(options.permissions?.client?.map(e => typeof e == 'string' ? PermissionFlagsBits[e] : e))
    };
    this.cooldowns = {
      guild: Math.max(options.cooldowns?.guild ?? 0, 0),
      channel: Math.max(options.cooldowns?.channel ?? 0, 0),
      user: Math.max(options.cooldowns?.user ?? 0, 0)
    };
    this.slashCommand = undefined;
    this.prefixCommand = undefined;
    this.dmPermission = options.dmPermission ?? false;
    this.disabled = options.disabled ?? false;
    this.disabledReason = options.disabledReason;
    this.options = options ?? [];
    this.beta = options.beta ?? false;
    this.run = options.run;

    this.#validateData();
    this.#setLocalization();
  }

  #validateData() {

  }

  #setLocalization() {

  }
}

class SlashCommand extends BaseCommand {
  noDefer; ephemeralDefer; id;

  /** @param {import('.').SlashCommandInitOptions}options*/
  constructor(options = {}) {
    super(options);

    this.slashCommand = true;
    this.prefixCommand = false;

    this.defaultMemberPermissions = undefined;
    this.noDefer = options.noDefer ?? false;
    this.ephemeralDefer = options.ephemeralDefer ?? false;

    this.id = undefined;
    this.type = ApplicationCommandType.ChatInput;
  }
}

class PrefixCommand extends BaseCommand {
  /** @param {import('.').PrefixCommandInitOptions}options*/
  constructor(options = {}) {
    super(options);

    this.slashCommand = false;
    this.prefixCommand = true;
  }
}

class MixedCommand extends classes(SlashCommand, PrefixCommand) {
  /** @param {import('.').MixedCommandInitOptions}options*/
  constructor(options = {}) {
    super(options);
  }
}

class CommandOptions {
  name; nameLocalizations; description; descriptionLocalizations;
  type; cooldowns; required; dmPermission; choices; autocomplete;
  strictAutocomplete; channelTypes; minValue; maxValue; minLength; maxLength;
  options;

  /** @param {import('.').CommandOptionsInitOptions}options*/
  constructor(options = {}) {
    this.name = options.name;
    this.nameLocalizations = undefined;
    this.description = options.description;
    this.descriptionLocalizations = undefined;
    this.type = typeof options.type == 'string' ? ApplicationCommandOptionType[options.type] : options.type;
    this.permissions = {
      client: new Set(options.permissions?.client?.map(e => typeof e == 'string' ? PermissionFlagsBits[e] : e)),
      user: new Set(options.permissions?.client?.map(e => typeof e == 'string' ? PermissionFlagsBits[e] : e))
    };
    this.cooldowns = options.cooldowns ?? {
      guild: Math.max(options.cooldowns?.guild ?? 0, 0),
      channel: Math.max(options.cooldowns?.channel ?? 0, 0),
      user: Math.max(options.cooldowns?.user ?? 0, 0)
    };
    this.required = options.required ?? false;
    this.dmPermission = options.dmPermission ?? false;

    this.choices = options.choices ?? [];
    if (!Array.isArray(this.choices)) this.choices = [this.choices];

    this.autocomplete = !!options.autocompleteOptions;
    if (options.autocompleteOptions) {
      this.strictAutocomplete = options.strictAutocomplete ?? false;

      this.autocompleteOptions = options.autocompleteOptions ?? [];
      if (!Array.isArray(this.autocompleteOptions)) this.autocompleteOptions = [this.autocompleteOptions];
    }

    this.channelTypes = options.channelTypes;
    this.minValue = options.minValue;
    this.maxValue = options.maxValue;
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;

    this.options = options.options;
  }
}

module.exports = { BaseCommand, SlashCommand, PrefixCommand, MixedCommand, CommandOptions };