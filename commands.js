/* eslint-disable @typescript-eslint/no-deprecated -- wip*/
const
  { ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits, PermissionsBitField, ChannelType } = require('discord.js'),
  { join, resolve, dirname, basename } = require('node:path'),
  I18nProvider = require('@mephisto5558/i18n'),
  getCallerFilePath = require('./utils/getCallerFilePath.js');

const
  MAX_DESCRIPTION_LENGTH = 100,
  MIN_CHOICE_NAME_LENGTH = 2,
  MAX_CHOICE_NAME_LENGTH = 32,
  defaultI18nProvider = new I18nProvider({ undefinedNotFound: true, localesPath: join(process.cwd(), 'Locales') });

/**
 * @typedef {import('./commands').BaseCommand}BaseCommand
 * @typedef {import('./commands').CommandOption}CommandOption
 * @typedef {{ log: typeof console['log'], error: typeof console['error'], warn: typeof console['warn'] }}logger*/

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


class BaseCommand {
  // Thanks to this I have types in the constructor
  filePath; nameLocalizations; category; langId; description; descriptionLocalizations;
  aliases; aliasOf; usage; usageLocalizations; permissions; cooldowns;
  slashCommand; prefixCommand; dmPermission; disabled; disabledReason; options; beta;

  /**
   * @param {import('./commands').BaseCommandInitOptions<boolean>}options
   * @param {logger}logger
   * @param {I18nProvider | undefined}i18n*/
  constructor(options, logger, i18n = defaultI18nProvider) {
    this.filePath = resolve(options.filePath ?? getCallerFilePath('Commands'));
    this.name = (options.name ?? basename(this.filePath).split('.')[0]).toLowerCase(); // NOSONAR
    this.nameLocalizations = new Map(); // gets filled in #setLocalization()
    this.category = basename(dirname(this.filePath)).toLowerCase();
    this.langId = `commands.${this.category}.${this.name}`;
    this.description = options.description ?? i18n.__({ errorNotFound: true }, `${this.langId}.description`); // NOSONAR
    this.descriptionLocalizations = new Map(); // gets filled in #setLocalization()
    this.aliases = options.aliases ?? {};
    this.aliasOf = undefined;
    this.usage = {}; // gets filled in #setLocalization()
    this.usageLocalizations = new Map(); // gets filled in #setLocalization()
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
    this.options = options.options ?? [];
    this.beta = options.beta ?? false;
    this.run = undefined;

    this.#setLocalization(i18n);
    this.#validateData(logger, i18n);
  }

  /**
   * Sets the localization for `name`, `description` and `usage`.
   * @param {I18nProvider}i18n*/
  #setLocalization(i18n) {
    for (const locale of i18n.availableLocales.keys()) {
      const usageLocalization = {
        usage: this.usage.usage ?? i18n.__({ locale, undefinedNotFound: true }, `${this.langId}.usage.usage`),
        examples: this.usage.examples ?? i18n.__({ locale, undefinedNotFound: true }, `${this.langId}.usage.examples`)
      };
      usageLocalization.usage &&= `{prefix}{cmdName} ${usageLocalization.usage}`.replaceAll('{cmdName}', this.name);
      usageLocalization.examples &&= `{prefix}{cmdName} ${usageLocalization.examples}`.replaceAll('{cmdName}', this.name);

      if (locale == i18n.config.defaultLocale) this.usage = usageLocalization;
      else this.usageLocalizations.set(locale, usageLocalization);


      if (locale == i18n.config.defaultLocale) continue;

      const nameLocalization = i18n.__({ locale, undefinedNotFound: true }, `${this.langId}.name`);
      if (nameLocalization) this.nameLocalizations.set(locale, nameLocalization);

      const descriptionLocalization = i18n.__({ locale, undefinedNotFound: true }, `${this.langId}.description`);
      if (descriptionLocalization) this.descriptionLocalizations.set(locale, descriptionLocalization);
    }
  }

  /**
   * @param {logger}logger
   * @param {I18nProvider}i18n
   * @throws {TypeError} upon wrong command.run type*/
  #validateData(logger, i18n) {
    if (this.disabled) return;

    if (this.name.includes('A-Z')) {
      logger.error(`"${this.name}" (${this.langId}.name) has uppercase letters! Fixing.`);
      this.name = this.name.toLowerCase();
    }

    if (this.description.length > MAX_DESCRIPTION_LENGTH) {
      logger.warn(`Description of command "${this.name}" (${this.langId}.description) is too long (max. length is ${MAX_DESCRIPTION_LENGTH})! Slicing.`);
      this.description = this.description.slice(0, MAX_DESCRIPTION_LENGTH);
    }

    if (!/^(?:async )?function/.test(this.run))
      throw new TypeError(`The "run" property of command "${this.name}" (${this.langId}.run) is not a function or async function (Got "${typeof this.run}")! You cannot use an arrow function.`);

    for (const [locale] of i18n.availableLocales.keys()) {
      const descriptionLocalization = this.descriptionLocalizations.get(locale);
      if (!descriptionLocalization) logger.warn(`Missing description localization for option "${this.name}" (${this.langId}.descriptionLocalizations.${locale})`);
      else if (descriptionLocalization.length > MAX_DESCRIPTION_LENGTH) {
        logger.warn(`Description localization of option "${this.name}" (${this.langId}.descriptionLocalizations.${locale}) is too long (max. length is ${MAX_DESCRIPTION_LENGTH})! Slicing.`);
        this.descriptionLocalizations.set(locale, descriptionLocalization.slice(0, MAX_DESCRIPTION_LENGTH));
      }
    }
  }
}

class SlashCommand extends BaseCommand {
  slashCommand; prefixCommand; defaultMemberPermissions;
  noDefer; ephemeralDefer; id; type; run;

  /**
   * @param {import('./commands').SlashCommandInitOptions}options
   * @param {logger}logger
   * @param {I18nProvider | undefined}i18n*/
  constructor(options, logger, i18n = defaultI18nProvider) {
    super(options, logger, i18n);

    this.slashCommand = true;
    this.prefixCommand = false;

    this.defaultMemberPermissions = this.permissions.user.size ? new PermissionsBitField([...this.permissions.user]) : undefined;
    this.noDefer = options.noDefer ?? false;
    this.ephemeralDefer = options.ephemeralDefer ?? false;

    this.id = undefined;
    this.type = ApplicationCommandType.ChatInput;

    /* eslint-disable-next-line @typescript-eslint/unbound-method */
    this.run = options.run;
  }
}

class PrefixCommand extends BaseCommand {
  /**
   * @param {import('./commands').PrefixCommandInitOptions}options
   * @param {logger}logger
   * @param {I18nProvider | undefined}i18n*/
  constructor(options, logger, i18n = defaultI18nProvider) {
    super(options, logger, i18n);

    this.slashCommand = false;
    this.prefixCommand = true;

    /* eslint-disable-next-line @typescript-eslint/unbound-method */
    this.run = options.run;
  }
}

class MixedCommand extends classes(SlashCommand, PrefixCommand) {
  /**
   * @this {SlashCommand & PrefixCommand}
   * @param {import('./commands').MixedCommandInitOptions}options
   * @param {logger}logger
   * @param {I18nProvider | undefined}i18n*/
  constructor(options, logger, i18n = defaultI18nProvider) {
    super(options, logger, i18n);

    this.slashCommand = true;
    this.prefixCommand = true;
  }
}

class CommandOption {
  name; nameLocalizations; description; descriptionLocalizations;
  type; cooldowns; required; dmPermission; choices; autocomplete;
  strictAutocomplete; channelTypes; minValue; maxValue; minLength; maxLength;
  options;

  /**
   * @param {import('./commands').CommandOptionInitOptions<boolean>}options
   * @param {logger?}logger
   * @param {I18nProvider | undefined}i18n*/
  constructor(options, logger = console, i18n = defaultI18nProvider) {
    this.name = options.name;
    this.nameLocalizations = new Map(); // gets filled in #setLocalization()
    this.langId = undefined; // gets set in #_setParent()
    this.description = options.description;
    this.descriptionLocalizations = new Map(); // gets filled in #setLocalization()
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

    const choices = options.choices ?? [];
    this.choices = (Array.isArray(choices) ? choices : [choices]).map(/** @param {import('./commands').CommandOption['choices'][number] | string | number}choice*/ choice => {
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

    this.#setLocalization(i18n);
    this.#validateData(logger, i18n);
  }

  /**
   * Sets the localization for `name`, `description` and `choices`.
   * @param {I18nProvider}i18n*/
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
   * @param {logger}logger
   * @param {I18nProvider}i18n
   * @throws {TypeError} on invalid type, channelType or minLength/minValue missmatch.*/
  #validateData(logger, i18n) {
    if (this.disabled) return;

    if (!(this.type in ApplicationCommandOptionType)) throw new TypeError(`Missing or invalid type for option "${this.langId}.type", got "${this.type}."`);

    if ([ApplicationCommandOptionType.Number, ApplicationCommandOptionType.Integer].includes(this.type) && (this.minLength != undefined || this.maxLength != undefined))
      throw new TypeError(`Number and Integer options do not support "minLength" and "maxLength" (${this.langId})`);
    if (this.type == ApplicationCommandOptionType.String && (this.minValue != undefined || this.maxValue != undefined))
      throw new TypeError(`String options do not support "minValue" and "maxValue" (${this.langId})`);

    this.channelTypes = this.channelTypes?.map((e, i) => {
      if (!(e in ChannelType)) throw new TypeError(`Invalid channelType for option "${this.langId}.channelTypes.${i}", got ${JSON.stringify(e)}`);
      return Number.isNaN(Number.parseInt(e)) ? ChannelType[e] : Number.parseInt(e);
    });

    for (const [locale] of i18n.availableLocales.keys()) {
      const descriptionLocalization = this.descriptionLocalizations.get(locale);
      if (!descriptionLocalization) logger.warn(`Missing description localization for option "${this.langId}.descriptionLocalizations.${locale}"`);
      else if (descriptionLocalization.length > MAX_DESCRIPTION_LENGTH) {
        logger.warn(`Description localization of option "${this.langId}.descriptionLocalizations.${locale}" is too long (maximum length is ${MAX_DESCRIPTION_LENGTH})! Slicing.`);
        this.descriptionLocalizations.set(locale, descriptionLocalization.slice(0, MAX_DESCRIPTION_LENGTH));
      }

      for (const choice of this.choices) {
        if (choice.name.length < MIN_CHOICE_NAME_LENGTH) {
          logger.error(`Choice name for option "${this.langId}.choices.${this.value}" is too short (minimum length is ${MIN_CHOICE_NAME_LENGTH})! Removing.`);
          this.choices = this.choices.filter(e => e.name != choice.name);
          continue;
        }
        else if (choice.name.length > MAX_CHOICE_NAME_LENGTH) {
          logger.warn(`Choice name for option "${this.langId}.choices.${this.value}" is too long (maximum length is ${MAX_CHOICE_NAME_LENGTH})! Slicing.`);
          choice.name = choice.name.slice(0, MAX_CHOICE_NAME_LENGTH);
        }

        const choiceLocalization = choice.nameLocalizations.get(locale);

        if (!choiceLocalization && choice.name != choice.value) logger.warn(`Missing choice name localization for option "${this.langId}.choices.${this.value}.nameLocalizations.${locale}"`);
        else if (choiceLocalization.length < MIN_CHOICE_NAME_LENGTH) {
          logger.error(`Choice name localization for option "${this.langId}.choices.${this.value}.nameLocalizations.${locale}" is too short (minimum length is ${MIN_CHOICE_NAME_LENGTH})! Removing.`);
          choice.nameLocalizations.delete(locale);
        }
        else if (choiceLocalization.length > MAX_CHOICE_NAME_LENGTH) {
          logger.warn(`Choice name localization for option "${this.langId}.choices.${this.value}.nameLocalizations.${locale}" is too long (maximum length is ${MAX_CHOICE_NAME_LENGTH})! Slicing.`);
          choice.nameLocalizations.set(locale, choiceLocalization.slice(0, MAX_CHOICE_NAME_LENGTH));
        }
      }
    }
  }

  _setParent(parent) {
    this.langId = `${parent.langId}.options.${this.name}`;
    delete this._setParent;
  }
}

module.exports = { BaseCommand, SlashCommand, PrefixCommand, MixedCommand, CommandOption };