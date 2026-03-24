/* eslint-disable max-lines */
import {
  ApplicationCommandOptionType, ChannelType, CommandInteraction, Locale as DLocale, Message, _NonNullableFields, inlineCode
} from 'discord.js';
import { autocompleteOptionsMaxAmt, choiceValueMaxLength, choiceValueMinLength, choicesMaxAmt, descriptionMaxLength } from '../../utils/constants.ts';
import { cooldownConverter, equal } from '../utils.ts';

import type {
  ApplicationCommandOption, ApplicationCommandOptionChoiceData, AutocompleteInteraction, Client, MessageComponentInteraction
} from 'discord.js';
import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';
import type {
  ChatInputCommandInteraction, Command, CooldownTypes, DefaultOptionType, Logger, ResolveContext, customPermissionChecksFn
} from '../../index.ts';
import type CooldownsManager from '../../utils/CooldownsManager.ts';
import type { RunnableReturns, StrictCommand } from '../command/utils.ts';
import type { CommandType } from '../utils.ts';
import type { CommandOptionConfig, StrictCommandOption, autocompleteObject, autocompleteOptions } from './utils.ts';

/* eslint-disable-next-line import-x/prefer-default-export */
export class CommandOption<
  const CT extends readonly CommandType[] = [],
  const DM extends boolean = false,
  const additionalRunOpts = never,
  const Options extends readonly (
    CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>
  )[] = readonly DefaultOptionType<CT, DM>[]
> {
  name: Lowercase<string>;
  id!: `${string}.options.${CommandOption['name']}`;
  position = 0;

  /** Currently not used */
  nameLocalizations?: Partial<Record<Locale, Lowercase<string>>>;
  description!: string;
  descriptionLocalizations!: Partial<Record<Locale, string>>;

  type: ApplicationCommandOptionType;

  required = false;

  cooldowns: Record<CooldownTypes, number> & {} = { guild: 0, channel: 0, user: 0 };
  dmPermission: DM = false as DM;

  disabled!: boolean;
  disabledReason: string | undefined;

  get autocomplete(): boolean { return !!this.autocompleteOptions; }
  strictAutocomplete = false;
  autocompleteOptions: autocompleteOptions | autocompleteOptions[] | (
      (
        this: ResolveContext<{ slash: AutocompleteInteraction<'cached'>; prefix: Message }, NoInfer<CT>>,
        query: string
      ) => autocompleteOptions[] | Promise<autocompleteOptions[]>
    ) | undefined;

  choices: ApplicationCommandOptionChoiceData[] | undefined;

  channelTypes: ChannelType[] | undefined;

  minValue?: number;
  maxValue?: number;

  minLength?: number;
  maxLength?: number;

  options!: StrictCommandOption<CT, DM>[];

  run!: (
    this: ResolveContext<{
      slash: ChatInputCommandInteraction<'cached', Options>;
      component: MessageComponentInteraction<'cached'>;
      prefix: Message;
    }, CT>,
    lang: Translator,
    options: additionalRunOpts, client: Client<true>
  ) => Promise<never>;

  #i18n!: I18nProvider;
  #cooldownsManager!: CooldownsManager;
  #logger!: Logger;

  constructor(config: CommandOptionConfig<CT, DM, additionalRunOpts, Options>) {
    this.name = config.name;
    this.type = config.type;

    if ('required' in config) this.required = config.required;

    switch (config.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        if (config.cooldowns)
          this.cooldowns = Object.fromEntries(Object.entries(this.cooldowns).map(e => cooldownConverter(config.cooldowns!, ...e)));
        if (config.dmPermission) this.dmPermission = config.dmPermission;
        if (config.options) this.options = config.options.map(e => (e instanceof CommandOption ? e : new CommandOption(e)));


        this.run = config.run;
        break;

      case ApplicationCommandOptionType.String:
        if (config.minLength) this.minLength = config.minLength;
        if (config.maxLength) this.maxLength = config.maxLength;

      // fall through
      case ApplicationCommandOptionType.Integer:
      case ApplicationCommandOptionType.Number:
        if (config.type != ApplicationCommandOptionType.String) {
          if (config.minValue) this.minValue = config.minValue;
          if (config.maxValue) this.maxValue = config.maxValue;
        }

        if (config.choices) this.choices = config.choices.map(e => ({ name: String(e), value: e }));

        this.autocompleteOptions = config.autocompleteOptions;
        if (config.strictAutocomplete) this.strictAutocomplete = config.strictAutocomplete;
        break;

      case ApplicationCommandOptionType.Channel:
        this.channelTypes = config.channelTypes;
        break;

      default: // no special handling
    }
  }

  init(
    i18n: I18nProvider, parentId: Command.Command['id'] | CommandOption['id'],
    cooldownsManager: CooldownsManager, logger: Logger = console, position = 0
  ): this {
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

  #validate(): void {
    if (/[A-Z]/.test(this.name)) {
      if (!this.disabled)
        this.#logger.error(`"${this.name}" (${this.id}.name) has uppercase letters! Fixing.`);

      this.name = this.name.toLowerCase();
    }

    if (this.options.length) {
      let foundOptional = false;
      for (const option of this.options) {
        if (!option.required) foundOptional = true;
        else if (foundOptional) {
          throw new TypeError(
            `Invalid option order in subcommand(group) ${this.id}. Required options (${option.id}) cannot appear after optional options.`
          );
        }
      }
    }
  }

  #localize(): void {
    for (const [locale] of this.#i18n.availableLocales) {
      const
        requiredTranslator = this.#i18n.getTranslator({ locale, errorNotFound: true, backupPaths: [this.id] }),
        optionalTranslator = this.#i18n.getTranslator({ locale, undefinedNotFound: true, backupPaths: [this.id] });

      ; /* eslint-disable-line @stylistic/no-extra-semi -- formatting reasons */

      // description
      const localizedDescription = locale == this.#i18n.config.defaultLocale ? optionalTranslator('description') : requiredTranslator('description');
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
    interaction: Parameters<customPermissionChecksFn>[0], command: StrictCommand<CT, DM, Options>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<Awaited<Exclude<ReturnType<customPermissionChecksFn<StrictCommand<CT, DM, Options>, RunnableReturns>>, string>>> {
    if (
      [ApplicationCommandOptionType.SubcommandGroup, ApplicationCommandOptionType.Subcommand].includes(this.type)
      && !this.dmPermission && (!interaction.channel || interaction.channel.type == ChannelType.DM)
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
        const channel = interaction.guild?.channels.cache.get(arg);
        if (channel && !this.channelTypes.includes(channel.type)) return ['invalidChannelType', this.name];
      }

      if (
        this.autocomplete && this.strictAutocomplete
        && (await this.generateAutocomplete(interaction, arg, wrapperTranslator.config.locale ?? wrapperTranslator.defaultConfig.defaultLocale))
          .some(e => e.value.toString().toLowerCase() === arg.toLowerCase())
      ) {
        if (typeof this.autocompleteOptions == 'function') return ['strictAutocompleteNoMatch', this.name];

        let availableOptions: string;
        if (!this.autocompleteOptions) availableOptions = '';
        else if (Array.isArray(this.autocompleteOptions))
          availableOptions = this.autocompleteOptions.map(e => (typeof e == 'object' ? e.value : e).toString()).map(inlineCode).join(', ');
        else if (typeof this.autocompleteOptions == 'object') availableOptions = this.autocompleteOptions.value.toString();
        else availableOptions = this.autocompleteOptions.toString();

        return ['strictAutocompleteNoMatchWValues', { option: this.name, availableOptions }];
      }

      if (this.choices && !this.choices.some(e => e.value == arg)) {
        return ['strictAutocompleteNoMatchWValues', {
          option: this.name,
          availableOptions: this.choices.map(e => inlineCode(e.value.toString())).join(', ')
        }];
      }
    }

    return false;
  }

  async #isRunnableSubcommandGroup(
    interaction: Parameters<customPermissionChecksFn>[0], command: StrictCommand<CT, DM, Options>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<Exclude<ReturnType<customPermissionChecksFn<StrictCommand<CT, DM, Options>, RunnableReturns>>, string>> {
    const
      subcommandName = interaction instanceof CommandInteraction ? interaction.options.getSubcommand(true) : args?.[0],
      subcommand = this.options.find(e => e.name == subcommandName);

    return subcommand?.isRunnable(
      interaction, command, wrapperTranslator,
      interaction instanceof Message ? args?.slice(1) : args
    ) ?? false;
  }

  async #isRunnableSubcommand(
    interaction: Parameters<customPermissionChecksFn>[0], command: StrictCommand<CT, DM, Options>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Promise<Exclude<ReturnType<customPermissionChecksFn<StrictCommand<CT, DM, Options>, RunnableReturns>>, string>> {
    for (const option of this.options) {
      const err = await option.isRunnable(interaction, command, wrapperTranslator, args);
      if (err) return err;
    }
    return false;
  }

  /** `translator` and `options` should not be supplied by an external caller. */
  async generateAutocomplete(
    interaction: AutocompleteInteraction | Message,
    query: string, locale: Locale, translator?: Translator<true, Locale>,
    options: StrictCommandOption<CT, DM>['autocompleteOptions'] = this.autocompleteOptions
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
   * @returns the currect cooldown for this subcommand(group) in ms.
   * Resets it if it's `0`. */
  updateCooldowns(interaction: ThisParameterType<StrictCommandOption<CT, DM, additionalRunOpts, Options>['run']>): number {
    return this.#cooldownsManager.update(this.id, interaction, this.cooldowns);
  }

  isEqualTo(opt: CommandOption<CommandType[], boolean> | ApplicationCommandOption): boolean {
    for (const prop of ['name', 'description', 'type', 'autocomplete', 'required', 'minValue', 'maxValue', 'minLength', 'maxLength'] as const) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion */
      const optProp = prop in opt ? opt[prop as keyof typeof opt] : undefined;
      if (this[prop] != (typeof this[prop] == 'boolean' ? !!optProp : optProp)) return false;
    }

    if (
      /* eslint-disable-next-line sonarjs/expression-complexity */
      this.options.length != ('options' in opt ? opt.options.length : 0)
      || !equal(this.nameLocalizations, opt.nameLocalizations)
      || !equal(this.descriptionLocalizations, opt.descriptionLocalizations)
      || ('choices' in opt && opt.choices && !this.#choicesEqualTo(opt.choices))
      || ('channelTypes' in opt && opt.channelTypes && !this.#channelTypesEqualTo(opt.channelTypes))
    ) return false;

    if (this.options.length && 'options' in opt) {
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
}