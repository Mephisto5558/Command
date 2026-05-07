/* eslint-disable max-lines */

import {
  ApplicationCommandOptionType, ApplicationCommandType, BaseInteraction, ChannelType,
  ChatInputCommandInteraction as _ChatInputCommandInteraction, Colors, EmbedBuilder, Message as _Message,
  MessageComponentInteraction as _MessageComponentInteraction, MessageFlags, PermissionsBitField, _NonNullableFields, inlineCode
} from 'discord.js';

// @ts-expect-error Cannot augment that module
import { getMilliseconds as getMilliseconds_ } from 'better-ms';
import { CommandExecutionError, CommandOption, CooldownType, DMPermType, Permission, PermissionType } from '../../index.ts';
import { descriptionMaxLength } from '../../utils/constants.ts';
import { CommandType, cooldownConverter, equal } from '../utils.ts';

import type { ApplicationCommand, Client, CommandInteraction, PermissionFlags, User } from 'discord.js';
import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';
import type {
  BetterMS, ChatInputCommandInteraction, DefaultOptionType, Logger,
  Message, MessageComponentInteraction, OptionsG, ResolveContext, commandDoneFn, customPermissionChecksFn
} from '../../index.ts';
import type { CooldownsManager } from '../../utils/index.ts';
import type { StrictCommandOption } from '../commandOption/utils.ts';
import type { CommandConfig, CommandMention, DeepOptions, ResolvedOption, RunnableReturns, StrictCommand } from './utils.ts';

const
  /* eslint-disable @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-non-null-assertion */
  getMilliseconds = getMilliseconds_ as typeof BetterMS.getMilliseconds,
  msInSeconds = getMilliseconds('1s')!,
  /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */

  CANNOT_SEND_MESSAGE_API_ERR = 50_007;

/* eslint-disable-next-line import-x/prefer-default-export */
export class Command<
  const CT extends readonly CommandType[] = [],
  const DM extends DMPermType = DMPermType.NeverDM,
  const Options extends OptionsG<CT, DM> = DefaultOptionType<CT, DM>[]
> /* implements ChatInputApplicationCommandData */ {
  name!: Lowercase<string>;
  id!: `commands.${Command['category']}.${Command['name']}`;
  commandId!: [CommandType.Slash] extends NoInfer<CT> ? Snowflake : undefined;

  /** Currently not used */
  nameLocalizations?: Partial<Record<Locale, Lowercase<string>>>;

  description!: string;
  descriptionLocalizations: Partial<Record<Locale, string>> = {};

  category!: Lowercase<string>;

  readonly type = ApplicationCommandType.ChatInput;

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion */
  readonly types: CT = [] as unknown as CT;

  usage: Record<'usage' | 'examples', string | undefined> & {} = { usage: undefined, examples: undefined };
  usageLocalizations: Partial<Record<Locale, StrictCommand<NoInfer<CT>, NoInfer<DM>>['usage']>> = {};

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- get's filled in the constructor */
  aliases: Record<NoInfer<CT>[number], Command['name'][]> = {} as Record<NoInfer<CT>[number], Command['name'][]>;

  cooldowns: Record<CooldownType, number> & {} = { [CooldownType.Guild]: 0, [CooldownType.Channel]: 0, [CooldownType.User]: 0 };

  permissions: Record<PermissionType, PermissionFlags[keyof PermissionFlags][]> = {
    [PermissionType.Client]: [Permission.ViewChannel, Permission.SendMessages],
    [PermissionType.Role]: [],
    [PermissionType.User]: [Permission.SendMessages],
    [PermissionType.Channel]: []
  };

  get defaultMemberPermissions(): PermissionsBitField['bitfield'] {
    return new PermissionsBitField(this.permissions[PermissionType.User]).bitfield;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion */
  dmPermission: DM = DMPermType.NeverDM as DM;

  disabled = false;
  disabledReason: string | undefined;

  noDefer = false;
  ephemeralDefer = false;

  beta = false;

  options: StrictCommandOption<CT, DM>[] = [];

  config = {
    devIds: new Set<Snowflake>(), devOnlyCategories: new Set<string>(),
    runBetaCommandsOnly: false,
    replyOn: { disabled: true, nonBeta: true }
  };

  mention<SubCommandGroupName extends string | undefined = undefined, SubcommandName extends string | undefined = undefined>(
    subcommandGroup?: SubCommandGroupName, subcommand?: SubcommandName
  ): CommandMention<SubCommandGroupName, SubcommandName, CT> {
    const path = [this.name, subcommandGroup, subcommand].filter(Boolean).join(' ');

    // using `0` here to not break the mention in Discord
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- fine here */
    return `</${path}:${this.commandId ?? 0}>` as CommandMention<SubCommandGroupName, SubcommandName, CT>;
  }

  run: (
    this: ExtendsMultiMatch<CT, [
      [CommandType.Slash, ChatInputCommandInteraction<DM, NoInfer<Options>>],
      [CommandType.Component, MessageComponentInteraction<DM> & { commandName: Command['name'] }],
      [CommandType.Prefix, Message<DM>]
    ]>,
    lang: Translator<false, Locale>,
    data: { client: Client<true>; command: Command<CT, DM, Options> }
  ) => unknown;

  #i18n!: I18nProvider;
  #logger!: Logger;
  #doneFn!: commandDoneFn;
  #cooldownsManager!: CooldownsManager;
  #customPermissionChecks: customPermissionChecksFn | undefined;

  constructor(config: CommandConfig<CT, DM, Options>) {
    if (config.usage) {
      if (config.usage.usage) this.usage.usage = config.usage.usage;
      if (config.usage.examples) this.usage.examples = config.usage.examples;
    }


    if (config.cooldowns) {
      this.cooldowns = Object.fromEntries(
        Object.entries(this.cooldowns).map(([k, v]) => cooldownConverter(config.cooldowns!, k, v))
      );
    }

    if (config.permissions) {
      for (const permissionType of Object.values(PermissionType))
        if (config.permissions[permissionType]) this.permissions[permissionType].push(...config.permissions[permissionType]);
    }

    if ('dmPermission' in config) this.dmPermission = config.dmPermission;
    if (config.disabled) this.disabled = config.disabled;

    if (config.noDefer) this.noDefer = config.noDefer;
    if (config.ephemeralDefer) this.ephemeralDefer = config.ephemeralDefer;

    if (config.options)
      this.options = config.options.map(e => CommandOption.from(e));

    if (config.beta) this.beta = config.beta;

    for (const commandType of config.types as NoInfer<CT>) {
      const type = commandType as NoInfer<CT>[number];
      this.aliases[type] = config.aliases?.[type] ?? [];
    }

    this.types = config.types;
    this.disabledReason = config.disabledReason;

    this.run = config.run;
  }

  init(i18n: I18nProvider, name: string, category: string, config: {
    logger?: Logger | undefined;
    doneFn?: commandDoneFn | undefined;
    customPermissionChecks?: customPermissionChecksFn | undefined;

    devIds?: Set<Snowflake> | undefined;
    devOnlyCategories?: Set<string> | undefined;
    runBetaCommandsOnly?: boolean | undefined;
    replyOn?: { disabled?: boolean; nonBeta?: boolean } | undefined;
    cooldownsManager?: CooldownsManager | undefined;
  } = {}): this {
    this.#i18n = i18n;
    if (config.logger) this.#logger = config.logger;
    if (config.doneFn) this.#doneFn = config.doneFn;
    if (config.cooldownsManager) this.#cooldownsManager = config.cooldownsManager;
    this.#customPermissionChecks = config.customPermissionChecks?.bind(this);

    if (config.devIds) this.config.devIds = config.devIds;
    if (config.devOnlyCategories) this.config.devOnlyCategories = config.devOnlyCategories;
    this.config.runBetaCommandsOnly = !!config.runBetaCommandsOnly;

    this.config.replyOn.disabled = !!config.replyOn?.disabled;
    this.config.replyOn.nonBeta = !!config.replyOn?.nonBeta;

    this.name = name.toLowerCase();
    this.category = category.toLowerCase();
    this.id = `commands.${this.category}.${this.name}`;

    this.#validate();
    this.#localize();

    for (const [i, option] of this.options.entries())
      option.init(this.#i18n, this.id, this.#cooldownsManager, this.#logger, i);

    return this;
  }

  #validate(): void {
    if (this.disabled) return;

    if (!['function', 'async function', 'async run(', 'run('].some(e => String(this.run).startsWith(e)))
      throw new TypeError(`The "run" method of command "${this.id}" is an arrow function! You cannot use arrow functions!`);

    if (this.options.length) {
      let foundOptional = false;
      for (const option of this.options) {
        if (!option.required) foundOptional = true;
        else if (foundOptional) {
          throw new TypeError(
            `Invalid option order in command "${this.id}". Required options ("${option.id}") cannot appear after optional options.`
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

      // usage
      const localizedUsage = {
        usage: this.usage.usage ?? optionalTranslator('usage.usage'),
        examples: this.usage.examples ?? optionalTranslator('usage.examples')
      };

      localizedUsage.usage &&= `{prefix}{cmdName} ${localizedUsage.usage}`.replaceAll('{cmdName}', this.name);
      localizedUsage.examples &&= `{prefix}{cmdName} ${localizedUsage.examples}`.replaceAll('{cmdName}', this.name);

      if (locale == this.#i18n.config.defaultLocale) this.usage = localizedUsage;
      else this.usageLocalizations[locale] = localizedUsage;
    }
  }

  async runWrapper(
    interaction: ThisParameterType<this['run']>,
    i18n: I18nProvider, locale: Locale
  ): Promise<void> {
    const
      wrapperTranslator = i18n.getTranslator({ locale, backupPaths: ['events.command'] }),
      commandTranslator = i18n.getTranslator({ locale, backupPaths: [this.id] }),
      errorKey = await this.#isRunnable(interaction, wrapperTranslator);

    if (errorKey === true) return; // already handled by the function
    if (errorKey !== false) {
      return interaction.reply({
        embeds: [new EmbedBuilder({ description: wrapperTranslator(...errorKey), color: Colors.Red })],
        flags: MessageFlags.Ephemeral
      });
    }

    interaction.commandName ??= this.name; // Is undefined on `MessageComponentInteraction`s

    let commandType;
    if (interaction instanceof _ChatInputCommandInteraction) commandType = CommandType.Slash;
    else if (interaction instanceof _MessageComponentInteraction) commandType = CommandType.Component;
    else commandType = CommandType.Prefix;

    this.#logger.debug(`Executing ${commandType} command ${this.name}`);

    if (
      commandType == CommandType.Slash && !(interaction instanceof _Message)
      && interaction.isChatInputCommand() && !this.noDefer && !interaction.replied
    ) await interaction.deferReply({ flags: this.ephemeralDefer ? MessageFlags.Ephemeral : undefined });

    try {
      await this.run.call(interaction, commandTranslator, { client: interaction.client, command: this });
      await this.#doneFn.call(interaction, this, commandTranslator);
    }
    catch (err) {
      throw new CommandExecutionError(err instanceof Error ? err.message : JSON.stringify(err), interaction, wrapperTranslator, { cause: err });
    }
  }

  /**
   * @returns the currect cooldown for this command or the subcommand(group) (whichever is higher) in ms.
   * Resets it if it's `0`. */
  #updateCooldowns(interaction: ThisParameterType<this['run']>): number {
    const
      currentCooldowns = [this.#cooldownsManager.update(this.id, interaction, this.cooldowns)],
      { group, subcommand } = this.#getSubcommandNames(interaction) ?? {};

    if (group) {
      const groupOption = this.options.find(e => e.name == group && e.type == ApplicationCommandOptionType.SubcommandGroup);
      if (groupOption) {
        if (Object.values(groupOption.cooldowns).some(Boolean))
          currentCooldowns.push(groupOption.updateCooldowns(interaction));

        if (subcommand) {
          const subOption = groupOption.options?.find(e => e.name == subcommand && e.type == ApplicationCommandOptionType.Subcommand);
          if (subOption && Object.values(subOption.cooldowns).some(Boolean))
            currentCooldowns.push(subOption.updateCooldowns(interaction));
        }
      }
    }
    else if (subcommand) {
      const subOption = this.options.find(e => e.name == subcommand && e.type == ApplicationCommandOptionType.Subcommand);
      if (subOption && Object.values(subOption.cooldowns).some(Boolean))
        currentCooldowns.push(subOption.updateCooldowns(interaction));
    }

    return Math.max(0, ...currentCooldowns);
  }

  #getSubcommandNames(interaction: ThisParameterType<this['run']>): { group: string | undefined; subcommand: string } | undefined {
    if (interaction instanceof BaseInteraction && interaction.isChatInputCommand()) {
      const commandInteraction = interaction as ChatInputCommandInteraction;
      if (!commandInteraction.options.getSubcommand(false)) return;
      return { group: commandInteraction.options.getSubcommandGroup(false) ?? undefined, subcommand: commandInteraction.options.getSubcommand(true) };
    }

    if (interaction instanceof _MessageComponentInteraction) return; // todo

    const
      args = (interaction as _Message).content.split(/\s+/).slice(1),
      option1 = this.options.find(e => e.name == args[0]);

    if (option1?.type == ApplicationCommandOptionType.Subcommand) return { group: undefined, subcommand: option1.name };
    if (option1?.type == ApplicationCommandOptionType.SubcommandGroup) {
      const subcommand = option1.options?.find(e => e.name == args[1] && e.type == ApplicationCommandOptionType.Subcommand);
      if (subcommand) return { group: option1.name, subcommand: subcommand.name };
    }
  }

  async #permissionChecks(
    interaction: CommandInteraction | Message | MessageComponentInteraction,
    author: User,
    wrapperTranslator: Translator<false, Locale>
  ): Promise<boolean | RunnableReturns> {
    if (!(interaction.inGuild() && interaction.guild && interaction.channel)) return false;

    const
      botChannelPerms = interaction.guild.members.me ? interaction.channel.permissionsFor(interaction.guild.members.me) : undefined,
      userPermsMissing = interaction.channel.permissionsFor(author)?.missing(this.permissions[PermissionType.User]) ?? [],
      botPermsMissing = botChannelPerms?.missing(this.permissions[PermissionType.Client]);

    if (!botPermsMissing?.length && !userPermsMissing.length) return false;

    const embed = new EmbedBuilder({
      title: wrapperTranslator('permissionDenied.embedTitle'),
      description: wrapperTranslator(`permissionDenied.embedDescription${botPermsMissing?.length ? 'Bot' : 'User'}`, {
        permissions: (botPermsMissing?.length ? botPermsMissing : userPermsMissing).map(perm => inlineCode(this.#i18n.__(
          { locale: wrapperTranslator.config.locale ?? wrapperTranslator.defaultConfig.defaultLocale, undefinedNotFound: true },
          `others.Perms.${perm}`
        ) ?? perm)).join(', ')
      }),
      color: Colors.Red
    });

    if (botChannelPerms?.missing([Permission.SendMessages, Permission.ViewChannel]).length) {
      if (interaction instanceof _Message && botChannelPerms.has(Permission.AddReactions))
        void interaction.react('\u274C').then(() => void interaction.react('\u270D\uFE0F'));

      try { await author.send({ content: interaction instanceof _Message ? interaction.url : '', embeds: [embed] }); }
      catch (err) {
        if (!(err instanceof Error && 'code' in err) || err.code != CANNOT_SEND_MESSAGE_API_ERR) throw err;
      }
    }
    else if (interaction instanceof BaseInteraction)
      await (interaction.isRepliable() ? interaction.reply({ embeds: [embed], ephemeral: true }) : interaction.channel.send({ embeds: [embed] }));
    else await interaction.reply({ embeds: [embed] });

    return true;
  }

  async #isRunnable(
    interaction: CommandInteraction | Message | MessageComponentInteraction,
    wrapperTranslator: Translator<false, Locale>
  ): Promise<RunnableReturns | boolean> {
    const
      author = interaction instanceof BaseInteraction ? interaction.user : interaction.author,
      args = interaction instanceof _Message ? interaction.content.split(/\s+/).slice(1) : undefined,
      staticErr = this.#staticRunnableChecks(interaction, author);

    if (staticErr) return staticErr;

    if (interaction.inGuild()) {
      const err = await this.#permissionChecks(interaction, author, wrapperTranslator);
      if (err) return err;
    }

    if (this.#customPermissionChecks) {
      const customErr = await this.#customPermissionChecks(interaction, author, wrapperTranslator);
      if (customErr) return customErr;
    }

    const activeOption = this.#resolveActiveOption(interaction, args);
    for (const option of activeOption ? [activeOption] : this.options) {
      const err = await option.isRunnable(interaction, this, wrapperTranslator, args?.slice(activeOption && interaction instanceof _Message ? 1 : 0));
      if (err) return err;
    }

    if (!this.config.runBetaCommandsOnly) {
      const cooldown = this.#updateCooldowns(interaction);
      if (cooldown) return ['cooldown', inlineCode(Math.round(cooldown / msInSeconds).toString())];
    }

    return false;
  }

  #staticRunnableChecks(
    interaction: CommandInteraction | Message | MessageComponentInteraction, author: User
  ): RunnableReturns | boolean {
    if (
      this.config.devOnlyCategories.has(this.category) && !this.config.devIds.has(author.id)
      || (interaction instanceof _Message && interaction.guild?.members.me?.communicationDisabledUntil)
    ) return true;
    if (this.config.runBetaCommandsOnly && !this.beta) return this.config.replyOn.nonBeta ? ['nonBeta'] : true;
    if (this.disabled) return this.config.replyOn.disabled ? ['disabled', this.disabledReason ?? 'Not provided'] : true;

    // TODO: remove hardcoded "Not provided"

    if (interaction instanceof _Message && !this.types.includes(CommandType.Prefix)) return ['slashOnly', this.mention()];

    if (this.dmPermission == DMPermType.NeverDM && interaction.channel?.type == ChannelType.DM) return ['guildOnly'];
    if (this.category == 'nsfw' && interaction.channel && (!('nsfw' in interaction.channel) || !interaction.channel.nsfw)) return ['nsfw'];
    return false;
  }

  #resolveActiveOption(
    interaction: CommandInteraction | Message | MessageComponentInteraction, args: string[] | undefined
  ): StrictCommandOption<CT, DM> | undefined {
    if (interaction instanceof BaseInteraction && interaction.isChatInputCommand()) {
      const group = interaction.options.getSubcommandGroup(false);
      if (group) return this.options.find(e => e.name == group);

      const subcommand = interaction.options.getSubcommand(false);
      if (subcommand) return this.options.find(e => e.name == subcommand);
    }
    else {
      return this.options.find(e => (!args || e.name == args[0])
        && [ApplicationCommandOptionType.Subcommand, ApplicationCommandOptionType.SubcommandGroup].includes(e.type));
    }
  }

  findOption<O extends { name: CommandOption['name']; type?: CommandOption['type'] } | { name?: string; type: ApplicationCommandOptionType } | undefined>(
    option?: O,
    interaction?: ThisParameterType<Command<[CommandType.Slash], NoInfer<DM>>['run']>
  ): IfExtendsStrict<O, undefined, {
    ifTrue: If<IsEmptyArray<Options>, { ifTrue: undefined; ifFalse: StrictCommandOption<CT, DM> }>;
    ifFalse: Extract<DeepOptions<Options[number]>, O> extends infer E ? IfExtendsStrict<E, never, { 
        ifTrue: undefined; 
        ifFalse: ResolvedOption<CT, DM, E> 
      }> : never;
  }> {
    const
      group = interaction?.options.getSubcommandGroup(false),
      subcommand = interaction?.options.getSubcommand(false);

    let options: StrictCommandOption<CT, DM>[] = this.options;
    if (group) options = this.options.find(e => e.name == group)?.options ?? [];
    if (subcommand) options = options.find(e => e.name == subcommand)?.options ?? [];

    return options.find(e => (!option?.name || e.name == option.name) && (!option?.type || e.type == option.type));
  }

  isEqualTo(cmd?: Command<readonly CommandType[], DMPermType> | ApplicationCommand): boolean {
    if (!cmd) return false;
    if (
      /* eslint-disable-next-line sonarjs/expression-complexity */
      this.name != cmd.name || this.description != cmd.description || this.type != cmd.type
      /* eslint-disable-next-line @typescript-eslint/no-deprecated -- todo */
      || this.dmPermission != cmd.dmPermission
      || this.defaultMemberPermissions != (
        cmd.defaultMemberPermissions instanceof PermissionsBitField ? cmd.defaultMemberPermissions.bitfield : cmd.defaultMemberPermissions
      )
      || !equal(this.nameLocalizations, cmd.nameLocalizations)
      || !equal(this.descriptionLocalizations, cmd.descriptionLocalizations)
    ) return false;

    if (this.options.length != cmd.options.length) return false;
    if (this.options.length) {
      for (const option of this.options) {
        const other = cmd.options.find(e => e.name == option.name);
        if (!other || !option.isEqualTo(other)) return false;
      }
    }

    return true;
  }

  static from<
    CT extends readonly CommandType[], DM extends DMPermType, Options extends OptionsG<CT, DM>
  >(command: CommandConfig<CT, DM, Options> | Command<CT, DM, Options>): Command<CT, DM, Options> {
    return command instanceof this ? command : new this(command);
  }
}