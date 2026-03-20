/* eslint-disable max-lines */

/**
 * @import { Translator } from '@mephisto5558/i18n'
 * @import { getMilliseconds as getMS, CommandType, customPermissionChecksFn } from '../..'
 * @import { CommandOption as CommandOptionT } from '../commandOption'
 * @import { Command as CommandT, CommandConfig, RunnableReturns } from '.' */


const
  {
    ApplicationCommandOptionType, ApplicationCommandType, ChannelType, Colors, CommandInteraction,
    EmbedBuilder, Message, MessageComponentInteraction, MessageFlags, PermissionFlagsBits, PermissionsBitField, inlineCode
  } = require('discord.js'),

  /** @type {getMS} *//* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  getMilliseconds = require('better-ms').ms,
  { CooldownsManager, constants: { descriptionMaxLength }, commandMention } = require('../../utils'),
  { CommandOption } = require('../commandOption'),
  { CommandExecutionError, commandTypes, cooldownConverter, equal } = require('../utils'),

  /** @type {number} */ msInSeconds = getMilliseconds('1s'),
  /** @type {number} */ PERM_ERR_MSG_DELETETIME = getMilliseconds('10s'),
  CANNOT_SEND_MESSAGE_API_ERR = 50_007;

class Command {
  /** @type {string} */ name;
  nameLocalizations = {};

  /** @type {CommandT<CommandType[]>['commandId'] | CommandT<['prefix']>['commandId']} */
  commandId;

  /** @type {string} */ description;
  descriptionLocalizations = {};

  /** @type {string} */ id;
  /** @type {CommandT<CommandType[], boolean>['types']} */ types = [];
  type = ApplicationCommandType.ChatInput;

  /** @type {CommandT['usage']} */ usage = { usage: undefined, examples: undefined };
  usageLocalizations = {};

  /** @type {CommandT<CommandType[]>['aliases']} */ aliases = { slash: [], prefix: [] };
  cooldowns = { guild: 0, channel: 0, user: 0 };

  /** @type {CommandT['permissions']} */
  permissions = { client: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], user: [PermissionFlagsBits.SendMessages] };
  get defaultMemberPermissions() {
    return new PermissionsBitField(this.permissions.user).bitfield;
  }

  dmPermission = false;

  disabled = false;
  disabledReason;

  noDefer = false;
  ephemeralDefer = false;

  config = {
    devIds: new Set(), devOnlyCategories: new Set(),
    runBetaCommandsOnly: false,
    replyOn: { disabled: true, nonBeta: true }
  };

  get mention() {
    return commandMention(this.name, this.id);
  }


  /** @type {CommandOptionT[]} */ options = [];

  /** @type {Parameters<CommandT<CommandType[], boolean>['init']>[0]} */ #i18n;
  /** @type {NonNullable<Parameters<CommandT<CommandType[], boolean>['init']>['3']>['logger']} */ #logger;
  /** @type {NonNullable<Parameters<CommandT<CommandType[], boolean>['init']>['3']>['doneFn']} */ #doneFn;
  /** @type {NonNullable<Parameters<CommandT<CommandType[], boolean>['init']>['3']>['cooldownsManager']} */ #cooldownsManager;
  /** @type {NonNullable<Parameters<CommandT<CommandType[], boolean>['init']>['3']>['customPermissionChecks'] | undefined} */ #customPermissionChecks;


  /** @param {CommandConfig<CommandType[], boolean>} config */
  constructor(config) {
    if (config.usage) {
      if (config.usage.usage) this.usage.usage = config.usage.usage;
      if (config.usage.examples) this.usage.examples = config.usage.examples;
    }

    if (config.aliases) {
      for (const commandType of Object.values(commandTypes))
        if (config.aliases[commandType]?.length) this.aliases[commandType] = config.aliases[commandType];
    }

    if (config.cooldowns)
      this.cooldowns = Object.fromEntries(Object.entries(this.cooldowns).map(cooldownConverter.bind(undefined, config.cooldowns)));

    if (config.permissions) {
      if (config.permissions.client) this.permissions.client.push(...config.permissions.client);
      if (config.permissions.user) this.permissions.user.push(...config.permissions.user);
    }

    if (config.dmPermission) this.dmPermission = config.dmPermission;
    if (config.disabled) this.disabled = config.disabled;

    if (config.noDefer) this.noDefer = config.noDefer;
    if (config.ephemeralDefer) this.ephemeralDefer = config.ephemeralDefer;

    if (config.options) this.options = config.options.map(e => (e instanceof CommandOption ? e : new CommandOption(e)));
    if (config.beta) this.beta = config.beta;

    this.types = config.types;
    this.disabledReason = config.disabledReason;

    this.run = config.run;
  }

  /** @type {CommandT<CommandType[], boolean>['init']} */
  init(i18n, name, category, {
    logger = console, doneFn, devIds, devOnlyCategories, runBetaCommandsOnly, replyOn = {},
    customPermissionChecks, cooldownsManager = new CooldownsManager()
  } = {}) {
    this.#i18n = i18n;
    this.#logger = logger;
    this.#doneFn = doneFn;
    this.#cooldownsManager = cooldownsManager;

    this.#customPermissionChecks = customPermissionChecks?.bind(this);

    if (devIds) this.config.devIds = devIds;
    if (devOnlyCategories) this.config.devOnlyCategories = devOnlyCategories;
    this.config.runBetaCommandsOnly = !!runBetaCommandsOnly;

    this.config.replyOn.disabled = !!replyOn.disabled;
    this.config.replyOn.nonBeta = !!replyOn.nonBeta;

    this.name = name.toLowerCase();
    this.category = category.toLowerCase();
    this.id = `commands.${this.category}.${this.name}`;

    this.#validate();
    this.#localize();

    for (const [i, option] of this.options.entries())
      option.init(this.#i18n, this.id, this.#cooldownsManager, this.#logger, i);

    return this;
  }

  #validate() {
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

  /** @type {CommandT<CommandType[], boolean>['runWrapper']} */
  async runWrapper(interaction, i18n, locale) {
    const
      wrapperTranslator = i18n.getTranslator({ locale, backupPaths: ['events.command'] }),
      commandTranslator = i18n.getTranslator({ locale, backupPaths: [this.id] }),
      errorKey = await this.#isRunnable(interaction, wrapperTranslator);

    if (errorKey !== false) {
      if (errorKey === true) return; // already handled by the function
      return interaction.reply({
        embeds: [new EmbedBuilder({ description: wrapperTranslator(...errorKey), color: Colors.Red })],
        flags: MessageFlags.Ephemeral
      });
    }

    interaction.commandName ??= this.name; // Is undefined on `MessageComponentInteraction`s

    let commandType;
    if (interaction instanceof CommandInteraction) commandType = commandTypes.slash;
    else if (interaction instanceof MessageComponentInteraction) commandType = commandTypes.component;
    else commandType = commandTypes.prefix;

    this.#logger.debug(`Executing ${commandType} command ${this.name}`);

    if (commandType == commandTypes.slash && interaction instanceof CommandInteraction && !this.noDefer && !this.replied)
      await interaction.deferReply({ flags: this.ephemeralDefer ? MessageFlags.Ephemeral : undefined });

    try {
      await this.run.call(interaction, commandTranslator, interaction.client);
      await this.#doneFn.call(interaction, this, commandTranslator);
    }
    catch (err) {
      throw new CommandExecutionError(err instanceof Error ? err.message : JSON.stringify(err), interaction, wrapperTranslator, { cause: err });
    }
  }

  /** @type {CommandT<CommandType[], boolean>['updateCooldowns']} */
  updateCooldowns(interaction) {
    const
      currentCooldowns = [this.#cooldownsManager.update(this.id, interaction, this.cooldowns)],
      { group, subcommand } = this.#getSubcommandNames(interaction) ?? {};

    if (group) {
      const groupOption = this.options.find(e => e.name == group && e.type == ApplicationCommandOptionType.SubcommandGroup);
      if (groupOption) {
        if (Object.values(groupOption.cooldowns).some(Boolean))
          currentCooldowns.push(groupOption.updateCooldowns(interaction));

        if (subcommand) {
          const subOption = groupOption.options.find(e => e.name == subcommand && e.type == ApplicationCommandOptionType.Subcommand);
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

  /**
   * @param {Parameters<CommandT<CommandType[], boolean>['updateCooldowns']>[0]} interaction
   * @returns {{ group: string | undefined, subcommand: string } | undefined} */
  #getSubcommandNames(interaction) {
    if (interaction instanceof CommandInteraction)
      return { group: interaction.options.getSubcommandGroup(false), subcommand: interaction.options.getSubcommand(false) };

    const
      args = interaction.content.split(/\s+/).slice(1),
      option1 = this.options.find(e => e.name == args[0]);

    if (option1?.type == ApplicationCommandOptionType.Subcommand) return { group: undefined, subcommand: option1.name };
    if (option1?.type == ApplicationCommandOptionType.SubcommandGroup) {
      const subcommand = option1.options.find(e => e.name == args[1] && e.type == ApplicationCommandOptionType.Subcommand);
      if (subcommand) return { group: option1.name, subcommand: subcommand.name };
    }
  }

  /**
   * @param {Parameters<customPermissionChecksFn<CommandT<CommandType[], false>>>[0]} interaction
   * @param {Parameters<customPermissionChecksFn<CommandT<CommandType[], false>>>[1]} author
   * @param {Parameters<customPermissionChecksFn>[2]} wrapperTranslator
   * @returns {ReturnType<customPermissionChecksFn>} */
  async #permissionChecks(interaction, author, wrapperTranslator) {
    const
      botChannelPerms = interaction.channel.permissionsFor(interaction.guild.members.me),
      userPermsMissing = interaction.channel.permissionsFor(author).missing(this.permissions.user),
      botPermsMissing = botChannelPerms.missing(this.permissions.client);

    if (!botPermsMissing.length && !userPermsMissing.length) return false;

    const embed = new EmbedBuilder({
      title: wrapperTranslator('permissionDenied.embedTitle'),
      description: wrapperTranslator(`permissionDenied.embedDescription${botPermsMissing.length ? 'Bot' : 'User'}`, {
        permissions: (botPermsMissing.length ? botPermsMissing : userPermsMissing).map(perm => inlineCode(this.#i18n.__(
          { locale: wrapperTranslator.config.locale, undefinedNotFound: true },
          `others.Perms.${perm}`
        ) ?? perm)).join(', ')
      }),
      color: Colors.Red
    });

    if (botChannelPerms.missing([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]).length) {
      if (interaction instanceof Message && botChannelPerms.has(PermissionFlagsBits.AddReactions))
        void interaction.react('\u274C').then(() => void interaction.react('\u270D\uFE0F'));

      try { await author.send({ content: interaction instanceof Message ? interaction.url : undefined, embeds: [embed] }); }
      catch (err) {
        if (err.code != CANNOT_SEND_MESSAGE_API_ERR) throw err;
      }
    }
    else if (interaction instanceof CommandInteraction) await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    else await interaction.reply({ embeds: [embed] }, PERM_ERR_MSG_DELETETIME);

    return true;
  }

  /**
   * @param {Parameters<customPermissionChecksFn>[0]} interaction
   * @param {Translator} wrapperTranslator
   * @returns {ReturnType<customPermissionChecksFn<Command, RunnableReturns>>} */
  async #isRunnable(interaction, wrapperTranslator) {
    const
      author = interaction instanceof CommandInteraction ? interaction.user : interaction.author,
      args = interaction instanceof Message ? interaction.content.split(/\s+/).slice(1) : undefined,
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
      const err = await option.isRunnable(interaction, this, wrapperTranslator, args?.slice(activeOption && interaction instanceof Message ? 1 : 0));
      if (err) return err;
    }

    if (!this.config.runBetaCommandsOnly) {
      const cooldown = this.updateCooldowns(interaction);
      if (cooldown) return ['cooldown', inlineCode(Math.round(cooldown / msInSeconds))];
    }

    return false;
  }

  /**
   * @param {Parameters<customPermissionChecksFn<CommandT<CommandType[], boolean>>>[0]} interaction
   * @param {Parameters<customPermissionChecksFn<CommandT<CommandType[], boolean>>>[1]} author
   * @returns {Awaited<ReturnType<customPermissionChecksFn>>} */
  #staticRunnableChecks(interaction, author) {
    if (
      this.config.devOnlyCategories.has(this.category) && !this.config.devIds.has(author.id)
      || (interaction instanceof Message && interaction.guild?.members.me.communicationDisabledUntil)
    ) return true;
    if (this.config.runBetaCommandsOnly && !this.beta) return this.config.replyOn.nonBeta ? ['nonBeta'] : true;
    if (this.disabled) return this.config.replyOn.disabled ? ['disabled', this.disabledReason ?? 'Not provided'] : true;

    // TODO: remove hardcoded "Not provided"

    if (interaction instanceof Message && !this.types.includes(commandTypes.prefix)) return ['slashOnly', this.mention];

    if (!this.dmPermission && interaction.channel.type == ChannelType.DM) return ['guildOnly'];
    if (this.category == 'nsfw' && !interaction.channel?.nsfw) return ['nsfw'];
    return false;
  }

  /**
   * @param {Parameters<CommandT<CommandType[], boolean>['updateCooldowns']>[0]} interaction
   * @param {string[] | undefined} args */
  #resolveActiveOption(interaction, args) {
    if (interaction instanceof CommandInteraction) {
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

  /** @type {CommandT['findOption']} */
  findOption({ name, type }, interaction) {
    const
      group = interaction?.options.getSubcommandGroup(false),
      subcommand = interaction?.options.getSubcommand(false);

    /* eslint-disable-next-line @typescript-eslint/no-this-alias -- this is required and fine in this context. */
    let { options } = this;
    if (group) ({ options } = options.find(e => e.name == group));
    if (subcommand) ({ options } = options.find(e => e.name == subcommand));

    return options.find(e => e.name == name && (!type || e.type == type));
  }

  /** @type {CommandT['isEqualTo']} */
  isEqualTo(cmd) {
    if (!cmd) return false;
    if (
      /* eslint-disable-next-line sonarjs/expression-complexity */
      this.name != cmd.name || this.description != cmd.description || this.type != cmd.type
      /* eslint-disable-next-line @typescript-eslint/no-deprecated */
      || this.dmPermission != cmd.dmPermission
      || this.defaultMemberPermissions != (cmd.defaultMemberPermissions?.bitfield ?? cmd.defaultMemberPermissions)
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
}

module.exports = { Command };