import type Discord from 'discord.js';
import type I18nProvider from '@mephisto5558/i18n';

export { BaseCommand, SlashCommand, PrefixCommand, MixedCommand, CommandOptions };
export type { BaseCommandInitOptions, SlashCommandInitOptions, PrefixCommandInitOptions, MixedCommandInitOptions, CommandOptionsInitOptions, lang };

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
  usage?: { usage?: string; examples?: string };
  permissions?: {
    client?: (keyof Discord.PermissionFlags)[];
    user?: (keyof Discord.PermissionFlags)[];
  };

  /** Cooldowns in milliseconds. Will be set to 0 if negative or undefined.*/
  cooldowns?: { guild?: number; channel?: number; user?: number };
  dmPermission?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  options?: (CommandOptions | CommandOptionsInitOptions)[];
  beta?: boolean;
  filePath?: string;

  run(this: Discord.ChatInputCommandInteraction | Discord.Message, lang: lang, client: Discord.Client<true>): Promise<never>;
};

declare class BaseCommand<guildOnly extends boolean = true> {
  constructor(options: BaseCommandInitOptions);

  /** Gets set to the command's filename.*/
  name: Lowercase<string>;

  /** Currently not in use*/
  nameLocalizations?: Record<typeof BaseCommand['name'], BaseCommand['name']>;

  /**
   * Gets set automatically from language files.
   * Can not be longer then 100 chars.*/
  description: string;

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.description}**/
  descriptionLocalizations: Record<string, BaseCommand['description']>;

  aliases: { slash?: BaseCommand['name'][]; prefix?: BaseCommand['name'][] };

  /** Command usage information for the end-user.*/
  usage: { usage?: string; examples?: string };

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.usage}*/
  usageLocalizations: Record<string, BaseCommand['usage']>;

  /** Gets set from the command's folder name.*/
  category: Lowercase<string>;

  permissions: {
    client: Set<Discord.PermissionFlags>;
    user: Set<Discord.PermissionFlags>;
  };

  /** If the command instance is an alias, this property will have the original name.*/
  aliasOf?: BaseCommand['name'];

  /** The command's full file path, useful for e.g. reloading the command.*/
  filePath: string;

  /** Numbers in milliseconds*/
  cooldowns: { guild: number; channel: number; user: number };

  /** Makes the command also work in direct messages.*/
  dmPermission: guildOnly extends true ? false : true;

  /** Beta commands are the only commands that get loaded when `client.env == 'dev'`.*/
  beta: boolean;

  /** This command will not be loaded*/
  disabled: boolean;

  /** If enabled in {@link ./config.json} and set here, will be shown to the user when they try to run the command.*/
  disabledReason?: string;

  options?: CommandOptions[];
}

type SlashCommandInitOptions = BaseCommandInitOptions & { noDefer?: boolean; ephemeralDefer?: boolean };
declare class SlashCommand<guildOnly extends boolean = true> extends BaseCommand<guildOnly> {
  constructor(options: SlashCommandInitOptions);

  slashCommand: true;
  prefixCommand: false;

  /** Do not deferReply to the interaction*/
  noDefer: boolean;

  /**
   * Do `interaction.deferReply({ ephemeral: true })`.
   *
   * Gets ignored if {@link SlashCommand.noDefer} is `true`.*/
  ephemeralDefer: boolean;

  id: Discord.Snowflake;
  type: Discord.ApplicationCommandType.ChatInput;
  defaultMemberPermissions: Discord.PermissionsBitField;

  run: (this: Discord.ChatInputCommandInteraction<guildOnly extends true ? 'cached' : Discord.CacheType>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

type PrefixCommandInitOptions = BaseCommandInitOptions;
declare class PrefixCommand<guildOnly extends boolean = true> extends BaseCommand<guildOnly> {
  constructor(options: PrefixCommandInitOptions);
  slashCommand: false;
  prefixCommand: true;

  run: (this: Discord.Message<guildOnly>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

type MixedCommandInitOptions = SlashCommandInitOptions & PrefixCommandInitOptions;
declare class MixedCommand<guildOnly extends boolean = true> extends BaseCommand<guildOnly> implements SlashCommand, PrefixCommand {
  // @ts-expect-error overwriting
  slashCommand: true;

  // @ts-expect-error overwriting
  prefixCommand: true;
  noDefer: boolean;
  ephemeralDefer: boolean;
  id: string;
  type: Discord.ApplicationCommandType.ChatInput;
  defaultMemberPermissions: Discord.PermissionsBitField;
  options?: CommandOptions[] | undefined;
  run: (this: Discord.ChatInputCommandInteraction<'cached'> | Discord.Message<true>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

type CommandOptionsInitOptions = {
  name: Lowercase<string>;
  type: keyof typeof Discord.ApplicationCommandOptionType;

  permissions?: BaseCommandInitOptions['permissions'];

  /** Numbers in milliseconds*/
  cooldowns?: BaseCommandInitOptions['cooldowns'];
  required?: boolean;

  /**
   * Only existent for {@link CommandOptions.type} `SubcommandGroup` and `Subcommand`.
   *
   * Makes the subcommand also work in direct messages.*/
  dmPermission?: BaseCommandInitOptions['dmPermission'];

  /** Choices the user must choose from. Can not be more then 25.*/
  choices?: (string | number | {
    name: string;
    nameLocalizations?: BaseCommand['nameLocalizations'];
    value: string | number;
  })[];

  /** Like choices, but not enforced unless {@link CommandOptions.strictAutocomplete} is enabled.*/
  autocompleteOptions?: string
  | autocompleteOptions[]
  | ((this: Discord.AutocompleteInteraction) => autocompleteOptions[] | Promise<autocompleteOptions>);

  /**
   * Return an error message to the user, if their input is not included in {@link CommandOptions.autocompleteOptions}.
   * Note that this happens for Messages as well.*/
  strictAutocomplete?: boolean;

  channelTypes?: (keyof typeof Discord.ChannelType)[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;

  /** Only existent for {@link CommandOptions.type} `SubcommandGroup` and `Subcommand`.*/
  options?: BaseCommandInitOptions['options'];
};

declare class CommandOptions {
  constructor(options: CommandOptionsInitOptions);

  name: Lowercase<string>;
  nameLocalizations?: BaseCommand['nameLocalizations'];

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.description}*/
  description: BaseCommand['description'];

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.descriptionLocalizations}*/
  descriptionLocalizations: BaseCommand['descriptionLocalizations'];

  type: Discord.ApplicationCommandOptionType;

  permissions: BaseCommand['permissions'];

  /** Numbers in milliseconds*/
  cooldowns: BaseCommand['cooldowns'];

  /** If true, the user must provide a value to this option. This is also enforced for prefix commands.*/
  required: boolean;

  /**
   * Only existent for {@link CommandOptions.type} `SubcommandGroup` and `Subcommand`.
   *
   * Makes the subcommand also work in direct messages.*/
  dmPermission: boolean;

  /** Choices the user must choose from. Can not be more then 25.*/
  choices?: {
    name: string;
    nameLocalizations?: BaseCommand['nameLocalizations'];
    value: string | number;
  }[];

  autocomplete: boolean;

  /** Like choices, but not enforced unless {@link CommandOptions.strictAutocomplete} is enabled.*/
  autocompleteOptions?: autocompleteOptions[]
  | ((this: Discord.AutocompleteInteraction) => autocompleteOptions[] | Promise<autocompleteOptions>);

  /**
   * Return an error message to the user, if their input is not included in {@link CommandOptions.autocompleteOptions}.
   * Note that this happens for Messages as well.*/
  strictAutocomplete?: boolean;

  channelTypes?: Discord.ChannelType[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;

  options?: BaseCommand['options'];
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