/**
 * @import { Locale } from '@mephisto5558/i18n'
 * @import { CommandType } from '../..'
 * @import { CommandOptionConfig, CommandOption as CommandOptionT } from '.' */

const
  { ApplicationCommandOptionType, ChannelType, CommandInteraction, Message, inlineCode } = require('discord.js'),
  { autocompleteOptionsMaxAmt, choiceValueMaxLength, choiceValueMinLength, choicesMaxAmt, descriptionMaxLength } = require('../../utils/constants'),
  { cooldownConverter, equal } = require('../utils');

module.exports = class CommandOption {
  name;

  /** @type {string} */ description;
  /** @type {CommandOptionT['descriptionLocalizations']} */ descriptionLocalizations = {};

  type;
  required = false;
  cooldowns = { guild: 0, channel: 0, user: 0 };
  dmPermission = false;
  get autocomplete() { return !!this.autocompleteOptions; }

  strictAutocomplete = false;
  autocompleteOptions;
  choices;
  channelTypes;
  /** @type {CommandOptionT['options']} */ options = [];

  position = 0;

  /** @type {Parameters<CommandOptionT['init']>['0']} */ #i18n;
  /** @type {Parameters<CommandOptionT['init']>['2']} */ #cooldownsManager;
  /** @type {Parameters<CommandOptionT['init']>['3']} */ #logger;

  /** @param {CommandOptionConfig<CommandType[], boolean>} config */
  constructor(config = {}) {
    this.name = config.name;
    this.type = config.type;

    if ('required' in config) this.required = config.required;

    switch (config.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        if (config.cooldowns)
          this.cooldowns = Object.fromEntries(Object.entries(this.cooldowns).map(cooldownConverter.bind(undefined, config.cooldowns)));
        if (config.dmPermission) this.dmPermission = config.dmPermission;
        if (config.options) this.options = config.options.map(e => (e instanceof CommandOption ? e : new CommandOption(e)));
        this.run = config.run;
        break;

      case ApplicationCommandOptionType.String:
        this.minLength = config.minLength;
        this.maxLength = config.maxLength;

      // fall through
      case ApplicationCommandOptionType.Integer:
      case ApplicationCommandOptionType.Number:
        if (config.type != ApplicationCommandOptionType.String) {
          this.minValue = config.minValue;
          this.maxValue = config.maxValue;
        }

        if (config.choices) this.choices = config.choices.map(e => ({ value: e }));

        this.autocompleteOptions = config.autocompleteOptions;
        if (config.strictAutocomplete) this.strictAutocomplete = config.strictAutocomplete;
        break;

      case ApplicationCommandOptionType.Channel:
        this.channelTypes = config.channelTypes;
        break;

      default: // no special handling
    }
  }

  /** @type {CommandOptionT['init']} */
  init(i18n, parentId, cooldownsManager, logger = console, position = 0) {
    this.#i18n = i18n;
    this.#logger = logger;
    this.#cooldownsManager = cooldownsManager;

    this.id = `${parentId}.options.${this.name}`;
    this.position = position;

    this.#validate();
    this.#localize();

    for (const [i, option] of this.options.entries())
      option.init(i18n, this.id, cooldownsManager, logger, i);

    return this;
  }

  #validate() {
    if (/[A-Z]/.test(this.name)) {
      if (!this.disabled)
        this.#logger.error(`"${this.name}" (${this.id}.name) has uppercase letters! Fixing.`);

      this.name = this.name.toLowerCase();
    }
  }

  #localize() {
    for (const [locale] of this.#i18n.availableLocales) {
      const
        requiredTranslator = this.#i18n.getTranslator({ locale, errorNotFound: true, backupPaths: [this.id] }),
        optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });

      ; /* eslint-disable-line @stylistic/no-extra-semi -- formatting reasons */

      // description
      const localizedDescription = locale == this.#i18n.config.defaultLocale ? optionalTranslator('description') : requiredTranslator('description');
      if (localizedDescription?.length > descriptionMaxLength && !this.disabled)
        this.#logger.warn(`"${locale}" description for command "${this.name}" (${this.id}.description) is too long (max length is 100)! Slicing.`);

      if (locale == this.#i18n.config.defaultLocale) this.description = localizedDescription.slice(0, descriptionMaxLength);
      else if (localizedDescription) this.descriptionLocalizations[locale] = localizedDescription.slice(0, descriptionMaxLength);
      else if (!this.disabled) this.#logger.warn(`Missing "${locale}" description for command "${this.name}" (${this.id}.description)`);


      // choices
      if ('choices' in this) this.#localizeChoices(locale);
    }
  }

  /**
   * @param {Locale} locale
   * @throws {Error} on too many choices */
  #localizeChoices(locale) {
    if (this.choices.length > choicesMaxAmt) {
      throw new Error(
        `Too many choices (${this.choices.length}) found for option "${this.name}"). Max is ${choicesMaxAmt}.`
        + 'Use autocompleteOptions with strictAutocomplete instead.'
      );
    }

    const optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });


    /** @type {NonNullable<CommandOptionT['choices']>[number]} */
    let choice;
    for (choice of this.choices) {
      choice.nameLocalizations ??= {};

      const localizedChoice = optionalTranslator(`choices.${choice.value}`) ?? choice.value.toString();
      if (localizedChoice) {
        const errMsg = `"${locale}" choice name localization for "${choice.value}" of option "${this.name}"`
          + `(${this.id}.choices.${choice.value}) is too`;

        if (localizedChoice.length < choiceValueMinLength) {
          this.#logger.warn(`${errMsg} short (min length is ${choiceValueMinLength})! Skipping this localization.`);
          continue;
        }
        else if (localizedChoice.length > choiceValueMaxLength)
          this.#logger.warn(`${errMsg} long (max length is ${choiceValueMaxLength})! Slicing.`);

        if (locale == this.#i18n.config.defaultLocale) choice.name = localizedChoice;
        else choice.nameLocalizations[locale] = localizedChoice;
      }
      else if (choice.name != choice.value && !this.disabled) {
        this.#logger.warn(
          `Missing "${locale}" choice name localization for "${choice.value}" in option "${this.name}" (${this.id}.choices.${choice.value})`
        );
      }
    }
  }

  /** @type {CommandOptionT<CommandType[], boolean>['isRunnable']} */
  async isRunnable(interaction, command, wrapperTranslator, args) {
    if (
      [ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(this.type)
      && !this.dmPermission && interaction.channel.type == ChannelType.DM
    ) return ['guildOnly'];

    if (this.type == ApplicationCommandOptionType.SubcommandGroup)
      return this.#isRunnableSubcommandGroup(interaction, command, wrapperTranslator, args);
    if (this.type == ApplicationCommandOptionType.Subcommand)
      return this.#isRunnableSubcommand(interaction, command, wrapperTranslator, args);

    const
      option = interaction instanceof CommandInteraction ? interaction.options.get(this.name)?.value : undefined,
      arg = args?.[this.position];

    if (this.required && option === undefined && !arg) {
      return ['paramRequired', {
        option: this.name,
        description: (wrapperTranslator.config.locale ? this.descriptionLocalizations[wrapperTranslator.config.locale] : undefined)
          ?? this.descriptionLocalizations[wrapperTranslator.defaultConfig.defaultLocale] ?? this.description
      }];
    }

    if (interaction instanceof Message && arg) { // if it's an interaction then these checks will be done by Discord
      if (this.type == ApplicationCommandOptionType.Channel && this.channelTypes) {
        const channel = interaction.guild.channels.cache.get(arg);
        if (channel && !this.channelTypes.includes(channel.type)) return ['invalidChannelType', this.name];
      }

      if (
        this.autocomplete && this.strictAutocomplete
        && (await this.generateAutocomplete(interaction, arg, wrapperTranslator.config.locale ?? wrapperTranslator.defaultConfig.defaultLocale))
          .some(e => e.value.toString().toLowerCase() === arg.toLowerCase())
      ) {
        if (typeof this.autocompleteOptions == 'function') return ['strictAutocompleteNoMatch', this.name];

        return ['strictAutocompleteNoMatchWValues', {
          option: this.name,
          availableOptions: Array.isArray(this.autocompleteOptions)
            ? this.autocompleteOptions.map(e => (typeof e == 'object' ? e.value : e)).map(inlineCode).join(', ')
            : this.autocompleteOptions
        }];
      }

      if (this.choices && !this.choices.some(e => e.value == arg))
        return ['strictAutocompleteNoMatchWValues', { option: this.name, availableOptions: this.choices.map(e => inlineCode(e.value)).join(', ') }];
    }

    return false;
  }

  /** @type {CommandOptionT<CommandType[], boolean>['isRunnable']} */
  async #isRunnableSubcommandGroup(interaction, command, wrapperTranslator, args) {
    const
      subcommandName = interaction instanceof CommandInteraction ? interaction.options.getSubcommand(true) : args[0],
      subcommand = this.options.find(e => e.name == subcommandName);

    return subcommand?.isRunnable(
      interaction, command, wrapperTranslator,
      interaction instanceof Message ? args.slice(1) : args
    ) ?? false;
  }

  /** @type {CommandOptionT<CommandType[], boolean>['isRunnable']} */
  async #isRunnableSubcommand(interaction, command, wrapperTranslator, args) {
    for (const option of this.options) {
      const err = await option.isRunnable(interaction, command, wrapperTranslator, args);
      if (err) return err;
    }
    return false;
  }

  /** @type {CommandOptionT['generateAutocomplete']} */
  async generateAutocomplete(interaction, query, locale, translator, options = this.autocompleteOptions) {
    if (options == undefined) return [];

    translator ??= this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [`${this.id}.choices`] });

    if (typeof options == 'function') options = await options.call(interaction, query);
    if (typeof options == 'string' || typeof options == 'number') return [{ name: translator(options) ?? options, value: options }];

    if (Array.isArray(options)) {
      return (await Promise.all(
        options
          .filter(e => !query || (typeof e == 'object' ? e.value : e).toString().toLowerCase().includes(query.toLowerCase()))
          .slice(0, autocompleteOptionsMaxAmt)
          .map(async e => this.generateAutocomplete(interaction, query, locale, translator, e))
      )).flat();
    }

    return [options];
  }

  /** @type {CommandOptionT<CommandType[], boolean>['updateCooldowns']} */
  updateCooldowns(interaction) {
    return this.#cooldownsManager.update(this.id, interaction, this.cooldowns);
  }

  /** @type {CommandOptionT<CommandType[]>['isEqualTo']} */
  isEqualTo(opt) {
    /** @type {(keyof CommandOptionT)[]} */
    for (const prop of ['name', 'description', 'type', 'autocomplete', 'required', 'minValue', 'maxValue', 'minLength', 'maxLength'])
      if (this[prop] != (typeof this[prop] == 'boolean' ? !!opt.prop : opt.prop)) return false;

    if (
      this.options.length != ('options' in opt ? opt.options.length : 0)
      || !equal(this.nameLocalizations, opt.nameLocalizations)
      || !equal(this.descriptionLocalizations, opt.descriptionLocalizations)
      || !this.#choicesEqualTo('choices' in opt ? opt.choices : undefined)
      || !this.#channelTypesEqualTo('channelTypes' in opt ? opt.channelTypes : undefined)
    ) return false;

    if (this.options.length && 'options' in opt) {
      for (const option of this.options) {
        const other = opt.options.find(e => e.name == option.name);
        if (!other || !option.isEqualTo(other)) return false;
      }
    }
    return true;
  }

  /** @param {CommandOptionT['choices']} choices */
  #choicesEqualTo(choices) {
    if ((this.choices?.length ?? 0) != (choices?.length ?? 0)) return false;
    if (this.choices?.length) {
      for (const choice of this.choices) {
        const other = choices.find(e => e.name == choice.name);
        if (!other || !equal(choice, other)) return false;
      }
    }

    return true;
  }

  /** @param {CommandOptionT['channelTypes']} channelTypes */
  #channelTypesEqualTo(channelTypes) {
    if ((this.channelTypes?.length ?? 0) != (channelTypes?.length ?? 0)) return false;
    if (this.channelTypes?.length) {
      for (const type of this.channelTypes)
        if (!channelTypes.includes(type)) return false;
    }

    return true;
  }
};