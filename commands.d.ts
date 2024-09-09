import type Discord from 'discord.js';
import type I18nProvider from '@mephisto5558/i18n';
import type { lang } from '.';

/* eslint-disable @typescript-eslint/no-invalid-void-type */
type CombineTypes<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] | B[K]
      : A[K] | void
    : K extends keyof B
      ? B[K] | void
      : never
};
/* eslint-enable @typescript-eslint/no-invalid-void-type */

export { BaseCommand, SlashCommand, PrefixCommand, MixedCommand, CommandOption };
export type { BaseCommandInitOptions, SlashCommandInitOptions, PrefixCommandInitOptions, MixedCommandInitOptions, CommandOptionInitOptions };

type autocompleteOptions = string | number | { name: string; value: string };

type BaseCommandInitOptions<canBeDM extends boolean | undefined = undefined> = {

  /** @deprecated Do not set manually.*/
  name?: Lowercase<string>;

  /** @deprecated Do not set manually.*/
  description?: string;
  aliases?: { slash?: BaseCommand<canBeDM>['name'][]; prefix?: BaseCommand<canBeDM>['name'][] };

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
  dmPermission?: canBeDM;
  disabled?: boolean;
  disabledReason?: string;
  options?: CommandOption[];
  beta?: boolean;
  filePath?: string;
};

declare class BaseCommand<canBeDM extends boolean | undefined = undefined, T_name extends Lowercase<string> = Lowercase<string>, T_category extends Lowercase<string> = Lowercase<string>> {
  constructor(options: BaseCommandInitOptions<canBeDM>, i18n?: I18nProvider);

  /** The command's full file path, useful for e.g. reloading the command.*/
  filePath: string;

  /** Gets set to the command's filename.*/
  name: T_name;

  /** Currently not in use*/
  nameLocalizations: Map<typeof BaseCommand<canBeDM>['name'], BaseCommand<canBeDM>['name']>;

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
  descriptionLocalizations: Map<string, BaseCommand<canBeDM>['description']>;

  aliases: { slash?: BaseCommand<canBeDM>['name'][]; prefix?: BaseCommand<canBeDM>['name'][] };

  /** If the command instance is an alias, this property will have the original name.*/
  aliasOf?: BaseCommand<canBeDM>['name'];

  /** Command usage information for the end-user.*/
  usage: { usage?: string; examples?: string };

  /**
   * Gets set automatically from language files.
   * @see {@link BaseCommand.usage}*/
  usageLocalizations?: Map<string, BaseCommand<canBeDM>['usage']>;

  permissions: {
    client: Set<Discord.PermissionFlags>;
    user: Set<Discord.PermissionFlags>;
  };

  /** Numbers in milliseconds*/
  cooldowns: { guild: number; channel: number; user: number };

  /** Makes the command also work in direct messages.*/
  dmPermission: canBeDM;

  /** This command will not be loaded*/
  disabled: boolean;

  /** If enabled in {@link ./config.json} and set here, will be shown to the user when they try to run the command.*/
  disabledReason?: string;

  options?: CommandOption<BaseCommand>[];

  /** Beta commands are the only commands that get loaded when `client.env == 'dev'`.*/
  beta: boolean;
}

type SlashCommandInitOptions<canBeDM extends boolean | undefined = undefined> = BaseCommandInitOptions<canBeDM> & {
  noDefer?: boolean; ephemeralDefer?: boolean;
  run(this: Discord.ChatInputCommandInteraction<canBeDM extends true ? Discord.CacheType : 'cached'>, lang: lang, client: Discord.Client<true>): Promise<never>;
};
declare class SlashCommand<canBeDM extends boolean | undefined = undefined> extends BaseCommand<canBeDM> {
  constructor(options: SlashCommandInitOptions<canBeDM>, i18n?: I18nProvider);

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

  run: (this: Discord.ChatInputCommandInteraction<canBeDM extends true ? Discord.CacheType : 'cached'>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

type PrefixCommandInitOptions<canBeDM extends boolean | undefined = undefined> = BaseCommandInitOptions<canBeDM> & {
  run(this: Discord.Message<canBeDM extends true ? boolean : true>, lang: lang, client: Discord.Client<true>): Promise<never>;
};
declare class PrefixCommand<canBeDM extends boolean | undefined = undefined> extends BaseCommand<canBeDM> {
  constructor(options: PrefixCommandInitOptions<canBeDM>, i18n?: I18nProvider);
  slashCommand: false;
  prefixCommand: true;

  run: (this: Discord.Message<canBeDM extends true ? boolean : true>, lang: lang, client: Discord.Client<true>) => Promise<never>;
}

type MixedCommandInitOptions<canBeDM extends boolean | undefined = undefined> = Omit<SlashCommandInitOptions<canBeDM> & PrefixCommandInitOptions<canBeDM>, 'run'> & {
  run(
    this: CombineTypes<ThisParameterType<SlashCommandInitOptions<canBeDM>['run']>, ThisParameterType<PrefixCommandInitOptions<canBeDM>['run']>>,
    lang: lang, client: Discord.Client<true>
  ): ReturnType<SlashCommandInitOptions<canBeDM>['run'] | PrefixCommandInitOptions<canBeDM>['run']>;
};
declare class MixedCommand<canBeDM extends boolean | undefined = undefined> extends BaseCommand<canBeDM> implements SlashCommand<canBeDM>, PrefixCommand<canBeDM> {
  constructor(options: MixedCommandInitOptions<canBeDM>, i18n?: I18nProvider);

  // @ts-expect-error overwriting
  slashCommand: true;

  // @ts-expect-error overwriting
  prefixCommand: true;
  defaultMemberPermissions: Discord.PermissionsBitField;
  noDefer: boolean;
  ephemeralDefer: boolean;
  id: Discord.Snowflake;
  type: Discord.ApplicationCommandType.ChatInput;
  options?: CommandOption[] | undefined;

  // @ts-expect-error This is fine and compatible.
  run: (
    this: CombineTypes<ThisParameterType<SlashCommandInitOptions<canBeDM>['run']>, ThisParameterType<PrefixCommandInitOptions<canBeDM>['run']>>,
    lang: lang, client: Discord.Client<true>
  ) => ReturnType<SlashCommand<canBeDM>['run'] | PrefixCommand<canBeDM>['run']>;
}

type CommandOptionInitOptions<canBeDM extends boolean | undefined = undefined> = {
  name: Lowercase<string>;

  /**
   * Gets set automatically from language files.
   * Can not be longer then 100 chars.*/
  description: string;
  type: keyof typeof Discord.ApplicationCommandOptionType;

  permissions?: BaseCommandInitOptions<canBeDM>['permissions'];

  /** Numbers in milliseconds*/
  cooldowns?: BaseCommandInitOptions<canBeDM>['cooldowns'];
  required?: boolean;

  /**
   * Only existent for {@link CommandOption.type} `SubcommandGroup` and `Subcommand`.
   *
   * Makes the subcommand also work in direct messages.*/
  dmPermission?: BaseCommandInitOptions<canBeDM>['dmPermission'];

  /** Choices the user must choose from. Can not be more then 25.*/
  choices?: (string | number | {
    name: string;
    nameLocalizations?: BaseCommand<canBeDM>['nameLocalizations'];
    value: string | number;
  })[];

  /** Like choices, but not enforced unless {@link CommandOption.strictAutocomplete} is enabled.*/
  autocompleteOptions?: string
  | autocompleteOptions[]
  | ((this: Discord.AutocompleteInteraction) => autocompleteOptions[] | Promise<autocompleteOptions>);

  /**
   * Return an error message to the user, if their input is not included in {@link CommandOption.autocompleteOptions}.
   * Note that this happens for Messages as well.*/
  strictAutocomplete?: boolean;

  channelTypes?: (keyof typeof Discord.ChannelType)[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;

  disabled: BaseCommandInitOptions<canBeDM>['disabled'];
  disabledReason: BaseCommandInitOptions<canBeDM>['disabledReason'];

  /** Only existent for {@link CommandOption.type} `SubcommandGroup` and `Subcommand`.*/
  options?: CommandOption['options'];
};

declare class CommandOption<T_parent extends SlashCommand | PrefixCommand | MixedCommand | BaseCommand | CommandOption = MixedCommand, T_name extends Lowercase<string> = Lowercase<string>> {
  constructor(options: CommandOptionInitOptions, parent: T_parent, i18n?: I18nProvider);

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
   * Only existent for {@link CommandOption.type} `SubcommandGroup` and `Subcommand`.
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

  /** Like choices, but not enforced unless {@link CommandOption.strictAutocomplete} is enabled.*/
  autocompleteOptions?: autocompleteOptions[]
  | ((this: Discord.AutocompleteInteraction) => autocompleteOptions[] | Promise<autocompleteOptions>);

  /**
   * Return an error message to the user, if their input is not included in {@link CommandOption.autocompleteOptions}.
   * Note that this happens for Messages as well.*/
  strictAutocomplete?: boolean;

  channelTypes?: Discord.ChannelType[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;

  disabled: BaseCommand['disabled'];
  disabledReason: BaseCommand['disabledReason'];

  options?: CommandOption<CommandOption>;
}