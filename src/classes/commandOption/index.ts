import {
  ApplicationCommandOptionType, ChannelType, Locale as DLocale, Message as _Message, _NonNullableFields, inlineCode
} from 'discord.js';
import { CooldownType, DMPermType } from '../../index.ts';
import { autocompleteOptionsMaxAmt, choiceValueMaxLength, choiceValueMinLength, choicesMaxAmt, descriptionMaxLength } from '../../utils/constants.ts';
import { CommandValidationError, cooldownConverter, equal } from '../utils.ts';

import type { ApplicationCommandOption, ApplicationCommandOptionChoiceData, Client } from 'discord.js';
import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';
import type { ChatInputCommandInteraction, Command, Logger, Message, MessageComponentInteraction } from '../../index.ts';
import type CooldownsManager from '../../utils/CooldownsManager.ts';
import type { RunnableReturns } from '../command/utils.ts';
import type { CommandType } from '../utils.ts';
import type {
  AutocompleteGeneratorOptions, ChannelCommandOptionConfig, CommandOptionConfig, NumericCommandOptionConfig,
  PublicAutocompleteGeneratorOptions, StringCommandOptionConfig, SubcommandConfig, SubcommandGroupConfig,
  autocompleteObject, autocompleteOptions
} from './utils.ts';

/* eslint-disable-next-line import-x/prefer-default-export -- simplifies re-export */
export class CommandOption<
  const CT extends readonly CommandType[] = [],
  const DM extends DMPermType = DMPermType.NeverDM,
  AO = undefined,
  const ChildrenOptions extends readonly CommandOptionConfig<CT, DM>[] = readonly CommandOptionConfig<CT, DM>[],
  T extends ApplicationCommandOptionType = ApplicationCommandOptionType
> {
  name: Lowercase<string>;
  id!: `${string}.options.${CommandOption['name']}`;
  position = 0;

  /** Currently not used */
  nameLocalizations?: Partial<Record<Locale, Lowercase<string>>>;
  description!: string;
  descriptionLocalizations!: Partial<Record<Locale, string>>;

  type: T;

  required = false;

  cooldowns: Record<CooldownType, number> = { [CooldownType.Guild]: 0, [CooldownType.Channel]: 0, [CooldownType.User]: 0 };

  dmPermission: DM = DMPermType.NeverDM as DM;

  disabled!: boolean;
  disabledReason: string | undefined;

  get autocomplete(): boolean { return !!this.autocompleteOptions; }
  strictAutocomplete = false;
  autocompleteOptions?: T extends ApplicationCommandOptionType.String | ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
    ? autocompleteOptions<NoInfer<CT>, NoInfer<DM>> | undefined
    : undefined;

  choices?: IfExtends<T, ApplicationCommandOptionType.String | ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number,
    { ifTrue: readonly ApplicationCommandOptionChoiceData[] }
  > | undefined;

  channelTypes?: IfExtends<T, ApplicationCommandOptionType.Channel,
    { ifTrue: readonly ChannelType[] }
  > | undefined;

  minValue?: IfExtends<T, ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number,
    { ifTrue: number }
  > | undefined;

  maxValue?: IfExtends<T, ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number,
    { ifTrue: number }
  > | undefined;

  minLength?: IfExtends<T, ApplicationCommandOptionType.String,
    { ifTrue: number }
  > | undefined;

  maxLength?: IfExtends<T, ApplicationCommandOptionType.String,
    { ifTrue: number }
  > | undefined;

  options?: IfExtends<T, ApplicationCommandOptionType.SubcommandGroup | ApplicationCommandOptionType.Subcommand,
    { ifTrue: CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>>[] }
  > | undefined;

  run?: (
    this: ExtendsMultiMatch<CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<DM>>],
      [CommandType.Prefix, Message<NoInfer<DM>>]
    ]>,
    lang: Translator<false, Locale>, options: NoInfer<AO>,
    data: {
      client: Client<true>;
      command: Command<NoInfer<CT>, NoInfer<DM>>;
      option: CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>>;
    }
  ) => unknown;

  #i18n!: I18nProvider;
  #cooldownsManager!: CooldownsManager;
  #logger!: Logger;

  /* eslint-disable-next-line @typescript-eslint/class-methods-use-this -- typing-only method */
  #resolveConfigType(
    config: CommandOptionConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<ChildrenOptions>> & { type: NoInfer<T> }
  ): ExtendsMatch<T, [
    [ApplicationCommandOptionType.SubcommandGroup, SubcommandGroupConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<ChildrenOptions>>],
    [ApplicationCommandOptionType.Subcommand, SubcommandConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<ChildrenOptions>>],
    [ApplicationCommandOptionType.String, StringCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>],
    [ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number, NumericCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>],
    [ApplicationCommandOptionType.Channel, ChannelCommandOptionConfig]
  ]> {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return -- typeguard method */
    return config as any;
  }

  /** @internal */
  constructor(configData: CommandOption<CT, DM, AO, ChildrenOptions, T>);
  /* eslint-disable-next-line @typescript-eslint/unified-signatures -- TS disagrees */
  constructor(configData: CommandOptionConfig<CT, DM, AO, ChildrenOptions> & { type: T });
  constructor(configData: CommandOptionConfig<CT, DM, AO, ChildrenOptions> & { type: T } | CommandOption<CT, DM, AO, ChildrenOptions, T>) {
    // need to set these specifically for typing
    this.type = configData.type;
    this.name = configData.name;

    if (configData instanceof CommandOption) {
      for (const key of Object.getOwnPropertyNames(configData) as (keyof typeof this)[]) {
        const descriptor = Object.getOwnPropertyDescriptor(configData, key)
          ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(configData) as object, key);

        if (!descriptor || descriptor.get || descriptor.writable === false) continue;

        const value = configData[key as keyof typeof configData];

        if (key == 'options')
          this.options = (value as NonNullable<typeof configData.options>).map(opt => opt.clone()) as unknown as typeof this.options;
        else if (value && typeof value == 'object' && typeof value != 'function')
          (this as Record<typeof key, unknown>)[key] = Array.isArray(value) ? [...value] : { ...value as Record<string | number | symbol, unknown> };
        else (this as Record<typeof key, unknown>)[key] = value;
      }

      return;
    }

    const config = this.#resolveConfigType(configData);
    if ('required' in config) this.required = config.required;

    switch (config.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        if ('cooldowns' in config)
          Object.fromEntries(Object.entries(this.cooldowns).map(e => cooldownConverter(config.cooldowns!, ...e)));

        if ('dmPermission' in config) this.dmPermission = config.dmPermission;
        if ('options' in config) {
          this.options = (config.options as (
            CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>> | CommandOptionConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>>)[])
            .map(opt => (opt instanceof CommandOption ? opt : new CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>>(opt))) as unknown as typeof this.options;
        }

        /* eslint-disable-next-line custom/unbound-method -- safe here */
        if ('run' in config) this.run = config.run as unknown as NonNullable<typeof this.run>;
        break;

      case ApplicationCommandOptionType.String:
        if ('minLength' in config) this.minLength = config.minLength as typeof this.minLength;
        if ('maxLength' in config) this.maxLength = config.maxLength as typeof this.maxLength;

        // fall through for choices and autocompleteOptions
      case ApplicationCommandOptionType.Integer:
      case ApplicationCommandOptionType.Number:
        if (config.type != ApplicationCommandOptionType.String) {
          if ('minValue' in config) this.minValue = config.minValue as typeof this.minValue;
          if ('maxValue' in config) this.maxValue = config.maxValue as typeof this.maxValue;
        }

        if ('choices' in config)
          this.choices = config.choices.map(e => ({ name: String(e), value: e })) as unknown as NonNullable<typeof this.choices>;

        this.autocompleteOptions = config.autocompleteOptions as typeof this.autocompleteOptions;
        if ('strictAutocomplete' in config) this.strictAutocomplete = config.strictAutocomplete;
        break;

      case ApplicationCommandOptionType.Channel:
        if ('channelTypes' in config) this.channelTypes = config.channelTypes as typeof this.channelTypes;
        break;

      default: // no special handling
    }
  }

  /**
   * {@link Command.init Commands} and not the user should initialize `CommandOption`s.
   * @internal */
  init(
    i18n: I18nProvider, parentId: Command['id'] | CommandOption['id'],
    cooldownsManager: CooldownsManager, logger: Logger = console, position = 0
  ): this {
    this.#i18n = i18n;
    this.#logger = logger;
    this.#cooldownsManager = cooldownsManager;

    this.id = `${parentId}.options.${this.name}`;
    this.position = position;

    this.#validate();
    this.#localize();

    if (this.options) {
      for (const [i, option] of this.options.entries())
        option.init(i18n, this.id, cooldownsManager, logger, i);
    }

    return this;
  }

  getChannel<RetSelf extends boolean = false>(
    interaction: ExtendsMultiMatch<CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<DM>>]
    ]>, returnSelf: RetSelf
  ): /* IfExtends<T, ApplicationCommandOptionType.Channel,
    AddIf<ExtractChannelTypesFromInstance<this, DM>, RetSelf, { ifFalse: undefined }>
    > { */
  unknown {
    if (this.type != ApplicationCommandOptionType.Channel)
      throw new Error(`This method does not run on ${ApplicationCommandOptionType[this.type]} options!`);

    let target = interaction instanceof _Message
      ? interaction.mentions.channels.first()
      : (interaction as ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>).options.getChannel(this.name, false, this.channelTypes);

    if (!target && interaction instanceof _Message)
      target = interaction.guild?.channels.cache.find(e => [e.id, e.name].some(e => interaction.content.includes(e)));
    if (target) return target;

    return returnSelf ? interaction.channel : undefined;
  }

  #validate(): void {
    if (/[A-Z]/.test(this.name)) {
      if (!this.disabled)
        this.#logger.error(`"${this.name}" (${this.id}.name) has uppercase letters! Fixing.`);

      this.name = this.name.toLowerCase();
    }

    if (this.options?.length) {
      let foundOptional = false;
      for (const option of this.options) {
        if (!option.required) foundOptional = true;
        else if (foundOptional) {
          throw new CommandValidationError(
            `Invalid option order in subcommand(group) ${this.id}. Required options (${option.id}) cannot appear after optional options.`,
            undefined, this
          );
        }
      }
    }
  }

  #localize(): void {
    for (const [locale] of this.#i18n.availableLocales) {
      const
        requiredTranslator = this.#i18n.getTranslator({ locale, errorNotFound: true, backupPaths: [this.id] }),
        optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] }),

        // description
        localizedDescription = locale == this.#i18n.config.defaultLocale ? optionalTranslator('description') : requiredTranslator('description');
      if (!localizedDescription) {
        if (!this.disabled)
          this.#logger.warn(`Missing "${locale}" description for command "${this.name}" (${this.id}.description)`);
      }
      else if (localizedDescription.length > descriptionMaxLength && !this.disabled)
        this.#logger.warn(`"${locale}" description for command "${this.name}" (${this.id}.description) is too long (max length is 100)! Slicing.`);

      if (localizedDescription) {
        if (locale == this.#i18n.config.defaultLocale) this.description = localizedDescription.slice(0, descriptionMaxLength);
        else this.descriptionLocalizations[locale] = localizedDescription.slice(0, descriptionMaxLength);
      }

      // choices
      if (this.choices) this.#localizeChoices(locale);
    }
  }

  /** @throws {Error} on too many choices */
  #localizeChoices(locale: Locale): void {
    if (!this.choices) return;

    if (this.choices.length > choicesMaxAmt) {
      throw new Error(
        `Too many choices (${this.choices.length}) found for option "${this.name}"). Max is ${choicesMaxAmt}.`
        + 'Use autocompleteOptions with strictAutocomplete instead.'
      );
    }

    const optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });

    for (const choice of this.choices) {
      choice.nameLocalizations ??= {};

      const localizedChoice = optionalTranslator(`choices.${choice.value}`) ?? choice.value.toString();
      if (localizedChoice) {
        const errMsg = `"${locale}" choice name localization for "${choice.value}" of option "${this.name}" `
          + `(${this.id}.choices.${choice.value}) is too`;

        if (localizedChoice.length < choiceValueMinLength) {
          this.#logger.warn(`${errMsg} short (min length is ${choiceValueMinLength})! Skipping this localization.`);
          continue;
        }
        else if (localizedChoice.length > choiceValueMaxLength)
          this.#logger.warn(`${errMsg} long (max length is ${choiceValueMaxLength})! Slicing.`);

        if (locale == this.#i18n.config.defaultLocale) choice.name = localizedChoice;
        else if (locale == 'en') {
          choice.nameLocalizations[DLocale.EnglishGB] = localizedChoice;
          choice.nameLocalizations[DLocale.EnglishUS] = localizedChoice;
        }
        else choice.nameLocalizations[locale] = localizedChoice;
      }
      else if (choice.name != choice.value && !this.disabled) {
        this.#logger.warn(
          `Missing "${locale}" choice name localization for "${choice.value}" in option "${this.name}" (${this.id}.choices.${choice.value})`
        );
      }
    }
  }

  async isRunnable(
    interaction: ExtendsMultiMatch<CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<DM>>]
    ]>,
    command: Command<NoInfer<CT>, NoInfer<DM>>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<RunnableReturns | boolean> {
    if (
      [ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(this.type)
      && this.dmPermission == DMPermType.NeverDM && interaction.channel.type == ChannelType.DM
    ) return ['guildOnly'];

    if (this.type == ApplicationCommandOptionType.SubcommandGroup)
      return this.#isRunnableSubcommandGroup(interaction, command, wrapperTranslator, args);
    if (this.type == ApplicationCommandOptionType.Subcommand)
      return this.#isRunnableSubcommand(interaction, command, wrapperTranslator, args);

    const
      option = interaction instanceof _Message
        ? undefined
        : (interaction as ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>).options.get(this.name)?.value,
      arg = args?.[this.position];

    if (this.required && option === undefined && !arg) {
      return ['paramRequired', {
        option: this.name,
        description: (wrapperTranslator.config.locale ? this.descriptionLocalizations[wrapperTranslator.config.locale] : undefined)
          ?? this.descriptionLocalizations[wrapperTranslator.defaultConfig.defaultLocale] ?? this.description
      }];
    }

    if (interaction instanceof _Message && arg) { // if it's an interaction then these checks will be done by Discord
      if (this.type == ApplicationCommandOptionType.Channel && this.channelTypes) {
        const channel = interaction.guild?.channels.cache.get(arg as Snowflake);
        if (channel && !this.channelTypes.includes(channel.type)) return ['invalidChannelType', this.name];
      }

      if (
        this.autocomplete && this.strictAutocomplete
        && !(await this.generateAutocomplete(
          interaction as unknown as Parameters<typeof this.generateAutocomplete>[0], arg,
          wrapperTranslator.config.locale ?? wrapperTranslator.defaultConfig.defaultLocale
        )).some(e => e.value.toString().toLowerCase() === arg.toLowerCase())
      ) {
        if (typeof this.autocompleteOptions == 'function') return ['strictAutocompleteNoMatch', this.name];

        let availableOptions: string | number;
        if (!this.autocompleteOptions) availableOptions = '';
        else if (Array.isArray(this.autocompleteOptions))
          availableOptions = this.autocompleteOptions.map(e => (typeof e == 'object' ? e.value : e).toString()).map(inlineCode).join(', ');
        else if (typeof this.autocompleteOptions == 'object') availableOptions = (this.autocompleteOptions as autocompleteObject).value;
        else availableOptions = this.autocompleteOptions;

        return ['strictAutocompleteNoMatchWValues', { option: this.name, availableOptions: availableOptions.toString() }];
      }

      if (this.choices && !this.choices.some(e => e.value.toString().toLowerCase() == arg.toLowerCase())) {
        return ['strictAutocompleteNoMatchWValues', {
          option: this.name,
          availableOptions: this.choices.map(e => inlineCode(e.value.toString())).join(', ')
        }];
      }
    }

    return false;
  }

  async #isRunnableSubcommandGroup(
    interaction: ExtendsMultiMatch<CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<DM>>]
    ]>,
    command: Command<NoInfer<CT>, NoInfer<DM>>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<RunnableReturns | boolean> {
    const
      subcommandName = interaction instanceof _Message
        ? args?.[this.position]
        : (interaction as ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>).options.getSubcommand(true),
      subcommand = this.options?.find(e => e.name == subcommandName);

    return subcommand?.isRunnable(
      interaction, command, wrapperTranslator,
      interaction instanceof _Message ? args?.slice(1) : args
    ) ?? false;
  }

  async #isRunnableSubcommand(
    interaction: ExtendsMultiMatch<CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<DM>, NoInfer<ChildrenOptions>>],
      [CommandType.Prefix, Message<NoInfer<DM>>]
    ]>,
    command: Command<NoInfer<CT>, NoInfer<DM>>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<RunnableReturns | boolean> {
    if (!this.options) return false;
    for (const option of this.options) {
      const err = await option.isRunnable(interaction, command, wrapperTranslator, args);
      if (err) return err;
    }

    return false;
  }

  /**
   * `translator` and `options` should not be supplied by an external caller.
   * @internal */
  async generateAutocomplete(
    ...args: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>
  ): Promise<[] | autocompleteObject[]>;
  async generateAutocomplete(...args: PublicAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>): Promise<[] | autocompleteObject[]>;
  async generateAutocomplete(
    /* eslint-disable @typescript-eslint/no-magic-numbers -- simple number order */
    interaction: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>[0],
    query: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>[1],
    locale: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>[2],
    translator?: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>[3],
    options: AutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>[4] = this.autocompleteOptions
    /* eslint-enable @typescript-eslint/no-magic-numbers */
  ): Promise<[] | autocompleteObject[]> {
    if (options == undefined) return [];

    translator ??= this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [`${this.id}.choices`] });

    if (typeof options == 'function') options = await options.call(interaction, query);
    if (typeof options == 'string' || typeof options == 'number')
      return [{ name: translator(options.toString()) ?? options.toString(), value: options }];

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

  /**
   * Resets it if it's `0`.
   * @returns the currect cooldown for this subcommand(group) in ms.
   * @internal */
  updateCooldowns(interaction: ChatInputCommandInteraction | Message | MessageComponentInteraction): number {
    return this.#cooldownsManager.update(this.id, interaction, this.cooldowns);
  }

  isEqualTo(opt: CommandOption<CommandType[], DMPermType> | ApplicationCommandOption): boolean {
    for (const prop of ['name', 'description', 'type', 'autocomplete', 'required', 'minValue', 'maxValue', 'minLength', 'maxLength'] as const) {
      const optProp = prop in opt ? opt[prop as keyof typeof opt] : undefined;
      if (this[prop] != (typeof this[prop] == 'boolean' ? !!optProp : optProp)) return false;
    }

    if (
      (this.options && 'options' in this.options ? this.options.length : 0) != ('options' in opt ? opt.options?.length : 0)
      || !equal(this.nameLocalizations, opt.nameLocalizations)
      || !equal(this.descriptionLocalizations, opt.descriptionLocalizations)
      || ('choices' in opt && opt.choices && !this.#choicesEqualTo(opt.choices))
      || ('channelTypes' in opt && opt.channelTypes && !this.#channelTypesEqualTo(opt.channelTypes))
    ) return false;

    if (this.options?.length && 'options' in opt && opt.options) {
      for (const option of this.options) {
        const other = opt.options.find(e => e.name == option.name);
        if (!other || !option.isEqualTo(other)) return false;
      }
    }
    return true;
  }

  #choicesEqualTo(choices: Readonly<NonNullable<CommandOption['choices']>>): boolean {
    if ((this.choices?.length ?? 0) != choices.length) return false;
    if (this.choices?.length) {
      for (const choice of this.choices) {
        const other = choices.find(e => e.name == choice.name);
        if (!other || !equal(choice, other)) return false;
      }
    }

    return true;
  }

  #channelTypesEqualTo(channelTypes: Readonly<NonNullable<CommandOption['channelTypes']>>): boolean {
    if ((this.channelTypes?.length ?? 0) != channelTypes.length) return false;
    if (this.channelTypes?.length) {
      for (const type of this.channelTypes)
        if (!channelTypes.includes(type)) return false;
    }

    return true;
  }

  clone(): CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<ChildrenOptions>, NoInfer<T>> {
    return new CommandOption(this);
  }
}