import Discord from 'discord.js';
import I18nProvider from '@mephisto5558/i18n';

export { BaseCommand, BaseCommandInitOptions, SlashCommand, PrefixCommand, CommandOptions, lang };

type BaseCommandInitOptions = {
  /** @deprecated Do not set manually.*/
  name?: Lowercase<string>;

  /** @deprecated Do not set manually.*/
  description?: string;
  aliases?: { slash?: BaseCommand['name'][]; prefix?: BaseCommand['name'][] };

  /**
   * Command usage information for the end-user.
   * Should be in the command file if its language-independent, otherwise in the language files.
   *
   * Gets modified upon initialization.*/
  usage: { usage?: string; examples?: string };
  permissions?: {
    client?: (keyof Discord.PermissionFlags)[];
    user?: (keyof Discord.PermissionFlags)[];
  };

  /** Cooldowns in milliseconds. Will be set to 0 if negative or undefined.*/
  cooldowns?: { guild?: number; channel?: number; user?: number };
  dmPermission?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  options: commandOption[];
  beta?: boolean;
  filePath?: string;

  run: (this: Discord.ChatInputCommandInteraction | Discord.Message, lang: lang, client: Discord.Client<true>) => Promise<never>;
};

class BaseCommand<guildOnly extends boolean = true> {
  constructor(options: BaseCommandInitOptions);

  /** Gets set to the command's filename.*/
  name: readonly Lowercase<string>;

  /** Currently not in use*/
  nameLocalizations?: readonly Record<typeof BaseCommand['name'], BaseCommand['name']>;

  /**
   * Gets set automatically from language files.
   * Can not be longer then 100 chars.*/
  description: readonly string;

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.description}**/
  descriptionLocalizations: readonly Record<string, BaseCommand['description']>;

  aliases: { slash?: BaseCommand['name'][]; prefix?: BaseCommand['name'][] };

  /** Command usage information for the end-user.*/
  usage: readonly { usage?: string; examples?: string };

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.usage}*/
  usageLocalizations: readonly Record<string, BaseCommand['usage']>;

  /** Gets set from the command's folder name.*/
  category: readonly Lowercase<string>;

  permissions: readonly {
    client: Set<Discord.PermissionFlags>;
    user: Set<Discord.PermissionFlags>;
  };

  /** If the command instance is an alias, this property will have the original name.*/
  aliasOf?: readonly BaseCommand['name'];

  /** The command's full file path, useful for e.g. reloading the command.*/
  filePath: readonly string;

  /** Numbers in milliseconds*/
  cooldowns: { guild: number; channel: number; user: number };

  /** Used in subclasses. */
  slashCommand: undefined;

  /** Used in subclasses. */

  prefixCommand: undefined;

  /** Makes the command also work in direct messages.*/
  dmPermission: guildOnly extends true ? false : true;

  /** Beta commands are the only commands that get loaded when `client.env == 'dev'`.*/
  beta: boolean;

  /** This command will not be loaded*/
  disabled: boolean;

  /** If enabled in {@link ./config.json} and set here, will be shown to the user when they try to run the command.*/
  disabledReason?: string;

  run: (this: Discord.ChatInputCommandInteraction | Discord.Message, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

class SlashCommand<guildOnly extends boolean = true> extends BaseCommand<guildOnly> {
  constructor(options: { noDefer?: boolean; ephemeralDefer?: boolean });

  slashCommand: readonly true;
  prefixCommand: readonly false;
  dmPermission: readonly boolean;

  /** Do not deferReply to the interaction*/
  noDefer: readonly boolean;

  /**
   * Do `interaction.deferReply({ ephemeral: true })`.
   *
   * Gets ignored if {@link SlashCommand.noDefer} is `true`.*/
  ephemeralDefer: readonly boolean;

  id: readonly Discord.Snowflake;
  type: readonly Discord.ApplicationCommandType.ChatInput;
  defaultMemberPermissions: readonly Discord.PermissionsBitField;

  options?: CommandOptions[];

  run: (this: Discord.ChatInputCommandInteraction<guildOnly extends true ? 'cached' : Discord.CacheType>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

class PrefixCommand<guildOnly extends boolean = true> extends BaseCommand<guildOnly> {
  slashCommand: false;
  prefixCommand: true;
  dmPermission: boolean;

  run: (this: Discord.Message<guildOnly>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

class CommandOptions {
  constructor(
    name: Lowercase<string>,
    type: keyof typeof Discord.ApplicationCommandOptionType,

    /** Numbers in milliseconds*/
    cooldowns?: BaseCommand['cooldowns'],
    required?: boolean,

    /**
     * Only existent for {@link CommandOptions.type} `SubcommandGroup` and `Subcommand`.
     *
     * Makes the subcommand also work in direct messages.*/
    dmPermission?: boolean,

    /** Choices the user must choose from. Can not be more then 25.*/
    choices?: (string | number | {
      name: string;
      nameLocalizations?: __local.BaseCommand<true>['nameLocalizations'];
      value: string | number;
    })[],

    /** Like choices, but not enforced unless {@link CommandOptions.strictAutocomplete} is enabled.*/
    autocompleteOptions?: string
    | autocompleteOptions[]
    | ((this: Discord.AutocompleteInteraction) => autocompleteOptions[] | Promise<autocompleteOptions>),

    /**
     * Return an error message to the user, if their input is not included in {@link CommandOptions.autocompleteOptions}.
     * Note that this happens for Messages as well.*/
    strictAutocomplete?: boolean,

    channelTypes?: (typeof Discord.ChannelType)[],
    minValue?: number,
    maxValue?: number,
    minLength?: number,
    maxLength?: number,

    options?: CommandOptions[]
  );

  name: readonly Lowercase<string>;
  nameLocalizations?: readonly BaseCommand['nameLocalizations'];

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.description}*/
  description: readonly local.BaseCommand['description'];

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.descriptionLocalizations}*/
  descriptionLocalizations: readonly BaseCommand['descriptionLocalizations'];

  type: readonly typeof Discord.ApplicationCommandOptionType;

  /** Numbers in milliseconds*/
  cooldowns: readonly BaseCommand['cooldowns'];

  /** If true, the user must provide a value to this option. This is also enforced for prefix commands.*/
  required: readonly boolean;

  /**
   * Only existent for {@link CommandOptions.type} `SubcommandGroup` and `Subcommand`.
   *
   * Makes the subcommand also work in direct messages.*/
  dmPermission: readonly boolean;

  /** Choices the user must choose from. Can not be more then 25.*/
  choices?: readonly {
    name: string;
    nameLocalizations?: BaseCommand['nameLocalizations'];
    value: string | number;
  }[];

  autocomplete: readonly boolean;

  /** Like choices, but not enforced unless {@link CommandOptions.strictAutocomplete} is enabled.*/
  autocompleteOptions?: readonly autocompleteOptions[]
  | ((this: Discord.AutocompleteInteraction) => autocompleteOptions[] | Promise<autocompleteOptions>);

  /**
   * Return an error message to the user, if their input is not included in {@link CommandOptions.autocompleteOptions}.
   * Note that this happens for Messages as well.*/
  strictAutocomplete?: readonly boolean;

  channelTypes?: Discord.ChannelType[];
  minValue?: readonly number;
  maxValue?: readonly number;
  minLength?: readonly number;
  maxLength?: readonly number;

  options?: readonly CommandOptions[];
}

type bBoundFunction<OF, T extends CallableFunction> = T & {

  /** The original, unbound function */
  __targetFunction__: OF;

  /** The context to which the function is bound */
  __boundThis__: ThisParameterType<T>;

  /** The arguments to which the function is bound */
  __boundArgs__: unknown[];
};

/** bBinded I18nProvider.__ function*/
type lang = bBoundFunction<I18nProvider['__'], (this: I18nProvider, key: string, replacements?: string | object) => string>;
type autocompleteOptions = string | number | { name: string; value: string };