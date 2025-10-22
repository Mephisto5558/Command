/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-lines -- TODO */

/**
 * @import { CommandOptionInitOptions } from './commands'
 * @import { MixedCommandInitOptions } from './commands'
 * @import { PrefixCommandInitOptions } from './commands'
 * @import { SlashCommandInitOptions } from './commands'
 * @import { BaseCommandInitOptions } from './commands'
 * @import { logger } from '.'
 * @import { CommandOption } from './commands'
 * @import { BaseCommand } from './commands' */


const
  { 
    ApplicationCommandOptionType, ApplicationCommandType, ChannelType,
    InteractionContextType, PermissionFlagsBits, PermissionsBitField
  } = require('discord.js'),
  { basename, dirname, join, resolve } = require('node:path'),
  { I18nProvider } = require('@mephisto5558/i18n'),
  getCallerFilePath = require('./utils/getCallerFilePath');

const

  // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-choice-structure
  MAX_DESCRIPTION_LENGTH = 100,

  // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-choice-structure
  MIN_CHOICE_NAME_LENGTH = 1,
  MAX_CHOICE_NAME_LENGTH = 32,
  DEV_MODE = false,
  defaultI18nProvider = new I18nProvider({ undefinedNotFound: true, localesPath: join(process.cwd(), 'Locales') });

/**
 * @typedef {BaseCommand} BaseCommand
 * @typedef {CommandOption} CommandOptionInitOptions */

// Source: https://stackoverflow.com/a/61860802/17580213
function classes(...bases) {
  /* eslint-disable-next-line @typescript-eslint/no-extraneous-class */
  class Bases {
    constructor(...args) {
      for (const Base of bases) Object.assign(this, new Base(...args));
    }
  }

  for (const Base of bases) {
    for (const prop of Object.getOwnPropertyNames(Base.prototype))
      if (prop != 'constructor') Bases.prototype[prop] = Base.prototype[prop];
  }

  return Bases;
}

/** @param {logger} logger */
function flipDevMode(logger) {
  if (logger._warn) {
    logger.warn = logger._warn;
    logger.error = logger._error;
    delete logger._warn;
    delete logger._error;

    return logger;
  }

  logger._warn = logger.warn;
  logger._error = logger.error;

  logger.warn = (...args) => {
    /* eslint-disable-next-line no-debugger -- intentional */
    debugger;
    return logger._warn(...args);
  };
  logger.error = (...args) => {
    /* eslint-disable-next-line no-debugger -- intentional */
    debugger;
    return logger._error(...args);
  };

  return logger;
}


class BaseCommand {
  // Thanks to this I have types in the constructor
  filePath; name; nameLocalizations; category; langId; description; descriptionLocalizations;
  aliases; aliasOf; usage; usageLocalizations; permissions; cooldowns;
  slashCommand; prefixCommand; context; disabled; disabledReason; options; beta;

  /**
   * @param {logger | undefined} logger
   * @param {BaseCommandInitOptions} options
   * @param {I18nProvider | undefined} i18n
   * @param {boolean} devMode
   * @default devMode=false */
  /* eslint-disable-next-line @typescript-eslint/default-param-last -- `logger` is intended to be bound by the lib user */
  constructor(logger = console, options, i18n = defaultI18nProvider, devMode = DEV_MODE) {
    this.filePath = resolve(getCallerFilePath('Commands'));
    this.name = basename(this.filePath).split('.')[0].toLowerCase();
    this.nameLocalizations = new Map(); // gets filled in #setLocalization()
    this.category = basename(dirname(this.filePath)).toLowerCase();
    this.langId = `commands.${this.category}.${this.name}`;
    this.description = i18n.__({ errorNotFound: true }, `${this.langId}.description`);
    this.descriptionLocalizations = new Map(); // gets filled in #setLocalization()
    this.aliases = options.aliases ?? {};
    this.aliasOf = undefined;
    this.usage = {}; // gets filled in #setLocalization()
    this.usageLocalizations = new Map(); // gets filled in #setLocalization()
    this.permissions = {
      client: new Set(options.permissions?.client?.map(e => (typeof e == 'string' ? PermissionFlagsBits[e] : e))),
      user: new Set(options.permissions?.client?.map(e => (typeof e == 'string' ? PermissionFlagsBits[e] : e)))
    };
    this.cooldowns = {
      guild: Math.max(options.cooldowns?.guild ?? 0, 0),
      channel: Math.max(options.cooldowns?.channel ?? 0, 0),
      user: Math.max(options.cooldowns?.user ?? 0, 0)
    };
    this.slashCommand = undefined;
    this.prefixCommand = undefined;
    this.context = options.context ? this.context.map(e => (typeof e == 'string' && e != '-Guild' ? InteractionContextType[e] : e)) : [InteractionContextType.Guild];
    this.disabled = options.disabled ?? false;
    this.disabledReason = options.disabledReason;
    this.options = options.options ?? [];
    this.beta = options.beta ?? false;
    this.run = undefined;

    if (devMode) flipDevMode(logger);

    for (const option of this.options) option.__init(`${this.langId}.options`, i18n);
  }

  /** @type {typeof BaseCommand['setLocalization']} */
  static setLocalization(command, i18n) {
    for (const locale of i18n.availableLocales.keys()) {
      const usageLocalization = {
        usage: command.usage.usage ?? i18n.__({ locale, undefinedNotFound: true }, `${command.langId}.usage.usage`),
        examples: command.usage.examples ?? i18n.__({ locale, undefinedNotFound: true }, `${command.langId}.usage.examples`)
      };
      usageLocalization.usage &&= `{prefix}{cmdName} ${usageLocalization.usage}`.replaceAll('{cmdName}', command.name);
      usageLocalization.examples &&= `{prefix}{cmdName} ${usageLocalization.examples}`.replaceAll('{cmdName}', command.name);

      if (locale == i18n.config.defaultLocale) command.usage = usageLocalization;
      else command.usageLocalizations.set(locale, usageLocalization);


      if (locale == i18n.config.defaultLocale) continue;

      const nameLocalization = i18n.__({ locale, undefinedNotFound: true }, `${command.langId}.name`);
      if (nameLocalization) command.nameLocalizations.set(locale, nameLocalization);

      const descriptionLocalization = i18n.__({ locale, undefinedNotFound: true }, `${command.langId}.description`);
      if (descriptionLocalization) command.descriptionLocalizations.set(locale, descriptionLocalization);
    }
  }

  /** @type {typeof BaseCommand['validateData']} */
  static validateData(command, logger, i18n) {
    if (command.disabled) return;

    if (command.name.includes('A-Z')) {
      logger.error(`"${command.name}" (${command.langId}.name) has uppercase letters! Fixing.`);
      command.name = command.name.toLowerCase();
    }

    if (command.description.length > MAX_DESCRIPTION_LENGTH) {
      logger.warn(`Description of command "${command.name}" (${command.langId}.description) is too long (max. length is ${MAX_DESCRIPTION_LENGTH})! Slicing.`);
      command.description = command.description.slice(0, MAX_DESCRIPTION_LENGTH);
    }

    if (!command.context.includes(InteractionContextType.Guild)) {
      if (command.context.includes('-Guild')) command.context = command.context.filter(e => e != '-Guild');
      else {
        logger.warn(
          `Context of command "${command.name}" (${command.langId}.context) does not include "Guild" context (${InteractionContextType.Guild}), meaning it will not be registered in guilds!\n`
          + 'If this is intentional, add "-Guild" to the context.'
        );
      }
    }

    for (let i = 0; i < command.options.length; i++) {
      if (!(command.options[i] instanceof CommandOption))
        throw new TypeError(`Invalid options array value, expected instance of CommandOption, got "${command.options[i].constructor.name}"! (${command.langId}.options.${i})`);
    }

    if (!/^(?:async )?(?:function\s?)?\w*\s*\(/.test(command.run)) {
      throw new TypeError(
        `The "run" property of command "${command.name}" (${command.langId}.run) is not a function or async function (Got "${typeof command.run}")! You cannot use an arrow function.`
      );
    }

    for (const locale of i18n.availableLocales.keys()) {
      if (locale == i18n.config.defaultLocale) continue;

      const descriptionLocalization = command.descriptionLocalizations.get(locale);
      if (!descriptionLocalization) logger.warn(`Missing description localization for option "${command.name}" (${command.langId}.descriptionLocalizations.${locale})`);
      else if (descriptionLocalization.length > MAX_DESCRIPTION_LENGTH) {
        logger.warn(`Description localization of option "${command.name}" (${command.langId}.descriptionLocalizations.${locale}) is too long (max. length is ${MAX_DESCRIPTION_LENGTH})! Slicing.`);
        command.descriptionLocalizations.set(locale, descriptionLocalization.slice(0, MAX_DESCRIPTION_LENGTH));
      }
    }
  }
}

class SlashCommand extends BaseCommand {
  slashCommand; prefixCommand; defaultMemberPermissions;
  noDefer; ephemeralDefer; id; type; run;

  /**
   * @param {logger | undefined} logger
   * @param {SlashCommandInitOptions} options
   * @param {I18nProvider | undefined} i18n
   * @param {boolean} devMode `@default` devMode=false */
  /* eslint-disable-next-line @typescript-eslint/default-param-last -- `logger` is intended to be bound by the lib user */
  constructor(logger = console, options, i18n = defaultI18nProvider, devMode = DEV_MODE) {
    super(logger, options, i18n, devMode);

    this.slashCommand = true;
    this.prefixCommand = false;

    this.defaultMemberPermissions = this.permissions.user.size ? new PermissionsBitField([...this.permissions.user]) : undefined;
    this.noDefer = options.noDefer ?? false;
    this.ephemeralDefer = options.ephemeralDefer ?? false;

    this.id = undefined;
    this.type = ApplicationCommandType.ChatInput;

    /* eslint-disable-next-line custom/unbound-method */
    this.run = options.run;

    // Object.getPrototypeOf(this.constructor) == `super` class
    Object.getPrototypeOf(this.constructor).setLocalization(this, i18n);
    Object.getPrototypeOf(this.constructor).validateData(this, logger, i18n);
  }

  static [Symbol.hasInstance](value) {
    for (let proto = Object.getPrototypeOf(value); proto != undefined; proto = Object.getPrototypeOf(proto))
      if (proto === SlashCommand.prototype || proto === MixedCommand.prototype) return true;
    return false;
  }
}

class PrefixCommand extends BaseCommand {
  /**
   * @param {logger | undefined} logger
   * @param {PrefixCommandInitOptions} options
   * @param {I18nProvider | undefined} i18n
   * @param {boolean} devMode `@default` devMode=false */
  /* eslint-disable-next-line @typescript-eslint/default-param-last -- `logger` is intended to be bound by the lib user */
  constructor(logger = console, options, i18n = defaultI18nProvider, devMode = DEV_MODE) {
    super(logger, options, i18n, devMode);

    this.slashCommand = false;
    this.prefixCommand = true;

    /* eslint-disable-next-line custom/unbound-method */
    this.run = options.run;

    // Object.getPrototypeOf(this.constructor) == `super` class
    Object.getPrototypeOf(this.constructor).setLocalization(this, i18n);
    Object.getPrototypeOf(this.constructor).validateData(this, logger, i18n);
  }

  static [Symbol.hasInstance](value) {
    for (let proto = Object.getPrototypeOf(value); proto != undefined; proto = Object.getPrototypeOf(proto))
      if (proto === PrefixCommand.prototype || proto === MixedCommand.prototype) return true;
    return false;
  }
}

class MixedCommand extends classes(SlashCommand, PrefixCommand) {
  /**
   * @this {MixedCommand}
   * @param {logger | undefined} logger
   * @param {MixedCommandInitOptions} options
   * @param {I18nProvider | undefined} i18n
   * @param {boolean} devMode `@default` devMode=false */
  /* eslint-disable-next-line @typescript-eslint/default-param-last -- `logger` is intended to be bound by the lib user */
  constructor(logger = console, options, i18n = defaultI18nProvider, devMode = DEV_MODE) {
    super(logger, options, i18n, devMode);

    this.slashCommand = true;
    this.prefixCommand = true;

    BaseCommand.setLocalization(this, i18n);
    BaseCommand.validateData(this, logger, i18n);
  }

  static [Symbol.hasInstance](value) {
    for (let proto = Object.getPrototypeOf(value); proto != undefined; proto = Object.getPrototypeOf(proto))
      if (proto === this.prototype || proto === SlashCommand.prototype || proto === PrefixCommand.prototype) return true;
    return false;
  }
}

class CommandOption {
  name; nameLocalizations; description; descriptionLocalizations;
  type; cooldowns; required; dmPermission; choices; autocomplete;
  strictAutocomplete; channelTypes; minValue; maxValue; minLength; maxLength;
  options;
  #logger;

  /**
   * @param {logger | undefined} logger
   * @param {CommandOptionInitOptions<boolean>} options
   * @param {I18nProvider | undefined} i18n
   * @param {boolean} devMode `@default` devMode=false */
  /* eslint-disable-next-line @typescript-eslint/default-param-last -- `logger` is intended to be bound by the lib user */
  constructor(logger = console, options, i18n = defaultI18nProvider, devMode = DEV_MODE) {
    this.name = options.name;
    this.nameLocalizations = new Map(); // gets filled in #setLocalization()
    this.langId = undefined; // gets set in __init()
    this.description = options.description;
    this.descriptionLocalizations = new Map(); // gets filled in #setLocalization()
    this.type = typeof options.type == 'string' ? ApplicationCommandOptionType[options.type] : options.type;
    this.permissions = {
      client: new Set(options.permissions?.client?.map(e => (typeof e == 'string' ? PermissionFlagsBits[e] : e))),
      user: new Set(options.permissions?.client?.map(e => (typeof e == 'string' ? PermissionFlagsBits[e] : e)))
    };
    this.cooldowns = options.cooldowns ?? {
      guild: Math.max(options.cooldowns?.guild ?? 0, 0),
      channel: Math.max(options.cooldowns?.channel ?? 0, 0),
      user: Math.max(options.cooldowns?.user ?? 0, 0)
    };
    this.required = options.required ?? false;
    this.dmPermission = options.dmPermission ?? false;

    const choices = options.choices ?? [];
    this.choices = (Array.isArray(choices) ? choices : [choices]).map(/** @param {CommandOption['choices'][number] | string | number} choice */ choice => {
      if (typeof choice == 'object') {
        choice.__NO_LOCALIZATION = true; // Removed in #setLocalization()
        return choice;
      }

      return {
        name: i18n.__({ undefinedNotFound: true }, `${this.langId}.choices.${choice}`) ?? choice,
        value: choice,
        nameLocalizations: undefined // gets filled in #setLocalization()
      };
    });

    this.autocomplete = Boolean(options.autocompleteOptions);
    if (this.autocomplete) {
      this.autocompleteOptions = options.autocompleteOptions ?? [];
      if (!Array.isArray(this.autocompleteOptions)) this.autocompleteOptions = [this.autocompleteOptions];

      this.strictAutocomplete = options.strictAutocomplete ?? false;
    }

    this.channelTypes = options.channelTypes; // Modified correctly in #validateData()
    this.minValue = options.minValue;
    this.maxValue = options.maxValue;
    this.minLength = options.minLength;
    this.maxLength = options.maxLength;

    this.options = options.options;

    this.#logger = logger;
    if (devMode) flipDevMode(this.#logger);
  }

  /** @type {CommandOption['__init']} */
  __init(langId, i18n = defaultI18nProvider) {
    this.langId = `${langId}.${this.name}`;

    this.#setLocalization(i18n);
    this.#validateData(i18n);

    if (this.options) for (const option of this.options) option.__init(this.langId + '.options', i18n);
  }

  /**
   * Sets the localization for `name`, `description` and `choices`.
   * @param {I18nProvider} i18n */
  #setLocalization(i18n) {
    for (const locale of i18n.availableLocales.keys()) {
      if (locale == i18n.config.defaultLocale) continue;

      const nameLocalization = i18n.__({ locale, undefinedNotFound: true }, `${this.langId}.name`);
      if (nameLocalization) this.nameLocalizations.set(locale, nameLocalization);

      const descriptionLocalization = i18n.__({ locale, undefinedNotFound: true }, `${this.langId}.description`);
      if (descriptionLocalization) this.descriptionLocalizations.set(locale, descriptionLocalization);

      for (const choice of this.choices) {
        if ('__NO_LOCALIZATION' in choice) {
          delete choice.__NO_LOCALIZATION;
          continue;
        }

        choice.nameLocalizations ??= new Map();
        const choiceLocalization = i18n.__({ locale, undefinedNotFound: true }, `${this.langId}.choices.${choice.value}`);
        if (choiceLocalization) choice.nameLocalizations.set(locale, choiceLocalization);
      }
    }
  }

  /**
   * @param {I18nProvider} i18n
   * @throws {TypeError} on invalid type, channelType or minLength/minValue missmatch. */
  #validateData(i18n) {
    if (this.disabled) return;

    if (!(this.type in ApplicationCommandOptionType)) throw new TypeError(`Missing or invalid type for option "${this.langId}.type", got "${this.type}."`);

    if ([ApplicationCommandOptionType.Number, ApplicationCommandOptionType.Integer].includes(this.type) && (this.minLength != undefined || this.maxLength != undefined))
      throw new TypeError(`Number and Integer options do not support "minLength" and "maxLength" (${this.langId})`);
    if (this.type == ApplicationCommandOptionType.String && (this.minValue != undefined || this.maxValue != undefined))
      throw new TypeError(`String options do not support "minValue" and "maxValue" (${this.langId})`);

    if (this.options) {
      for (let i = 0; i < this.options.length; i++) {
        if (!(this.options[i] instanceof CommandOption))
          throw new TypeError(`Invalid options array value, expected instance of CommandOption, got "${this.options[i].constructor.name}"! (${this.langId}.options.${i})`);
      }
    }

    this.channelTypes = this.channelTypes?.map((e, i) => {
      if (!(e in ChannelType)) throw new TypeError(`Invalid channelType for option "${this.langId}.channelTypes.${i}", got ${JSON.stringify(e)}`);
      return Number.isNaN(Number.parseInt(e)) ? ChannelType[e] : Number.parseInt(e);
    });

    for (const locale of i18n.availableLocales.keys()) {
      if (locale == i18n.config.defaultLocale) continue;

      const descriptionLocalization = this.descriptionLocalizations.get(locale);
      if (!descriptionLocalization) this.#logger.warn(`Missing description localization for option "${this.langId}.descriptionLocalizations.${locale}"`);
      else if (descriptionLocalization.length > MAX_DESCRIPTION_LENGTH) {
        this.#logger.warn(`Description localization of option "${this.langId}.descriptionLocalizations.${locale}" is too long (maximum length is ${MAX_DESCRIPTION_LENGTH})! Slicing.`);
        this.descriptionLocalizations.set(locale, descriptionLocalization.slice(0, MAX_DESCRIPTION_LENGTH));
      }

      for (const choice of this.choices) {
        if (choice.name.length < MIN_CHOICE_NAME_LENGTH) {
          this.#logger.error(`Choice name for option "${this.langId}.choices.${this.value}" is too short (minimum length is ${MIN_CHOICE_NAME_LENGTH})! Removing.`);
          this.choices = this.choices.filter(e => e.name != choice.name);
          continue;
        }
        else if (choice.name.length > MAX_CHOICE_NAME_LENGTH) {
          this.#logger.warn(`Choice name for option "${this.langId}.choices.${this.value}" is too long (maximum length is ${MAX_CHOICE_NAME_LENGTH})! Slicing.`);
          choice.name = choice.name.slice(0, MAX_CHOICE_NAME_LENGTH);
        }

        const choiceLocalization = choice.nameLocalizations.get(locale);

        if (!choiceLocalization) {
          if (choice.name != choice.value) this.#logger.warn(`Missing choice name localization for option "${this.langId}.choices.${this.value}.nameLocalizations.${locale}"`);
        }
        else if (choiceLocalization.length < MIN_CHOICE_NAME_LENGTH) {
          this.#logger.error(
            `Choice name localization for option "${this.langId}.choices.${this.value}.nameLocalizations.${locale}" is too short (minimum length is ${MIN_CHOICE_NAME_LENGTH})! Removing.`
          );
          choice.nameLocalizations.delete(locale);
        }
        else if (choiceLocalization.length > MAX_CHOICE_NAME_LENGTH) {
          this.#logger.warn(
            `Choice name localization for option "${this.langId}.choices.${this.value}.nameLocalizations.${locale}" is too long (maximum length is ${MAX_CHOICE_NAME_LENGTH})! Slicing.`
          );
          choice.nameLocalizations.set(locale, choiceLocalization.slice(0, MAX_CHOICE_NAME_LENGTH));
        }
      }
    }
  }
}

module.exports = { BaseCommand, SlashCommand, PrefixCommand, MixedCommand, CommandOption };