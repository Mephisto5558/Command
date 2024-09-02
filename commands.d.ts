import type Discord from 'discord.js';
import type I18nProvider from '@mephisto5558/i18n';
import type { lang } from '.';

export { BaseCommand, SlashCommand, PrefixCommand, MixedCommand, CommandOptions };
export type { BaseCommandInitOptions, SlashCommandInitOptions, PrefixCommandInitOptions, MixedCommandInitOptions, CommandOptionsInitOptions };

type autocompleteOptions = string | number | { name: string; value: string };

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
};

declare class BaseCommand<guildOnly extends boolean = boolean, T_name extends Lowercase<string> = Lowercase<string>, T_category extends Lowercase<string> = Lowercase<string>> {
  constructor(options: BaseCommandInitOptions, i18n?: I18nProvider);

  /** The command's full file path, useful for e.g. reloading the command.*/
  filePath: string;

  /** Gets set to the command's filename.*/
  name: T_name;

  /** Currently not in use*/
  nameLocalizations: Map<typeof BaseCommand['name'], BaseCommand['name']>;

  /** Gets set from the command's folder name.*/
  category: T_category;

  langId: `commands.${T_category}.${T_name}`;

  /**
   * Gets set automatically from language files.
   * Can not be longer then 100 chars.*/
  description: string;

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.description}**/
  descriptionLocalizations: Map<string, BaseCommand['description']>;

  aliases: { slash?: BaseCommand['name'][]; prefix?: BaseCommand['name'][] };

  /** If the command instance is an alias, this property will have the original name.*/
  aliasOf?: BaseCommand['name'];

  /** Command usage information for the end-user.*/
  usage: { usage?: string; examples?: string };

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.usage}*/
  usageLocalizations?: Map<string, BaseCommand['usage']>;

  permissions: {
    client: Set<Discord.PermissionFlags>;
    user: Set<Discord.PermissionFlags>;
  };

  /** Numbers in milliseconds*/
  cooldowns: { guild: number; channel: number; user: number };

  /** Makes the command also work in direct messages.*/
  dmPermission: guildOnly extends true ? false : true;

  /** This command will not be loaded*/
  disabled: boolean;

  /** If enabled in {@link ./config.json} and set here, will be shown to the user when they try to run the command.*/
  disabledReason?: string;

  options?: CommandOptions[];

  /** Beta commands are the only commands that get loaded when `client.env == 'dev'`.*/
  beta: boolean;
}

type SlashCommandInitOptions = BaseCommandInitOptions & {
  noDefer?: boolean; ephemeralDefer?: boolean;
  run(this: Discord.ChatInputCommandInteraction, lang: lang, client: Discord.Client<true>): Promise<never>;
};
declare class SlashCommand<guildOnly extends boolean = boolean> extends BaseCommand<guildOnly> {
  constructor(options: SlashCommandInitOptions, i18n?: I18nProvider);

  slashCommand: true;
  prefixCommand: false;

  defaultMemberPermissions: Discord.PermissionsBitField;

  /** Do not deferReply to the interaction*/
  noDefer: boolean;

  /**
   * Do `interaction.deferReply({ ephemeral: true })`.
   *
   * Gets ignored if {@link SlashCommand.noDefer} is `true`.*/
  ephemeralDefer: boolean;

  id: Discord.Snowflake;
  type: Discord.ApplicationCommandType.ChatInput;

  run: (this: Discord.ChatInputCommandInteraction<guildOnly extends true ? 'cached' : Discord.CacheType>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

type PrefixCommandInitOptions = BaseCommandInitOptions & {
  run(this: Discord.Message, lang: lang, client: Discord.Client<true>): Promise<never>;
};
declare class PrefixCommand<guildOnly extends boolean = boolean> extends BaseCommand<guildOnly> {
  constructor(options: PrefixCommandInitOptions, i18n?: I18nProvider);
  slashCommand: false;
  prefixCommand: true;

  run: (this: Discord.Message<guildOnly extends true ? true : boolean>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

type MixedCommandInitOptions = SlashCommandInitOptions & PrefixCommandInitOptions;
declare class MixedCommand<guildOnly extends boolean = boolean> extends BaseCommand<guildOnly> implements SlashCommand<guildOnly>, PrefixCommand<guildOnly> {
  constructor(options: MixedCommandInitOptions, i18n?: I18nProvider);

  // @ts-expect-error overwriting
  slashCommand: true;

  // @ts-expect-error overwriting
  prefixCommand: true;
  defaultMemberPermissions: Discord.PermissionsBitField;
  noDefer: boolean;
  ephemeralDefer: boolean;
  id: Discord.Snowflake;
  type: Discord.ApplicationCommandType.ChatInput;
  options?: CommandOptions[] | undefined;

  run: (
    this: Discord.ChatInputCommandInteraction<guildOnly extends true ? 'cached' : Discord.CacheType> | Discord.Message<guildOnly extends true ? true : boolean>,
    lang: lang, client: Discord.Client<true>
  ) => Promise<never>;
}

type CommandOptionsInitOptions = {
  name: Lowercase<string>;

  /**
   * Gets set automatically from language files.
   * Can not be longer then 100 chars.*/
  description: string;
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

  disabled: BaseCommandInitOptions['disabled'];
  disabledReason: BaseCommandInitOptions['disabledReason'];

  /** Only existent for {@link CommandOptions.type} `SubcommandGroup` and `Subcommand`.*/
  options?: BaseCommandInitOptions['options'];
};

declare class CommandOptions<T_parent extends BaseCommand | CommandOptions = BaseCommand, T_name extends Lowercase<string> = Lowercase<string>> {
  constructor(options: CommandOptionsInitOptions, parent: T_parent, i18n?: I18nProvider);

  name: T_name;
  nameLocalizations?: BaseCommand['nameLocalizations'];

  langId: `${T_parent['langId']}.options.${T_name}}`;

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
  choices: {
    name: string;
    nameLocalizations?: BaseCommand['nameLocalizations'];
    value: string | number;
  }[];

  /** Gets set automatically.*/
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

  disabled: BaseCommand['disabled'];
  disabledReason: BaseCommand['disabledReason'];

  options?: BaseCommand['options'];
}