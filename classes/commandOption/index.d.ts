/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  APIInteractionDataResolvedChannel, APIRole, ApplicationCommandOption, ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType, Attachment, AutocompleteInteraction, CacheType, CategoryChannel, ChannelType,
  Client, CommandInteractionOptionResolver, GuildBasedChannel,
  GuildMember, Message, NewsChannel, Role, StageChannel, TextChannel, ThreadChannel, User, VoiceChannel, _NonNullableFields
} from 'discord.js';
import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';
import type { ChatInputCommandInteraction, CommandType, DefaultOptionType, OptionsG, ResolveContext, SharedConfig, customPermissionChecksFn } from '../..';
import type { CooldownsManager } from '../../utils/index.js';
import type { Command } from '../command';


// #region utils
type autocompleteObject = StrictOmit<ApplicationCommandOptionChoiceData, 'nameLocalizations'>;
type autocompleteOptions = autocompleteObject['value'] | autocompleteObject;

type StrictCommandOption<
  CT extends readonly CommandType[], DM extends boolean, AO = never,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> = CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>>;

// #region option resolver
type OptionName<Options extends readonly unknown[], Type extends ApplicationCommandOptionType>
  = Options[number] extends infer O
    ? O extends { type: Type; name: infer N } ? (N extends string ? N : never)
    : O extends { type: ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup; options: infer SubOptions }
      ? (SubOptions extends readonly unknown[] ? OptionName<SubOptions, Type> : never)
      : never
    : never;

type GetOption<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType>
  = Options[number] extends infer O
    ? O extends { name: Name; type: Type } ? O
    : O extends { type: ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup; options: infer SubOptions }
      ? (SubOptions extends readonly unknown[] ? GetOption<SubOptions, Name, Type> : never)
      : never
    : never;

type ResolvedChannelType<T extends ChannelType>
  = T extends ChannelType.GuildText ? TextChannel
  : T extends ChannelType.GuildVoice ? VoiceChannel
  : T extends ChannelType.GuildCategory ? CategoryChannel
  : T extends ChannelType.GuildAnnouncement ? NewsChannel
  : T extends ChannelType.GuildStageVoice ? StageChannel
  : T extends ChannelType.PublicThread | ChannelType.PrivateThread | ChannelType.AnnouncementThread ? ThreadChannel
  : GuildBasedChannel;

type MapChannelTypes<Types extends readonly ChannelType[]> = ResolvedChannelType<Types[number]>;

type ResolvedChannel<Options extends readonly unknown[], Name extends string>
  = GetOption<Options, Name, ApplicationCommandOptionType.Channel> extends { channelTypes: readonly ChannelType[] }
    ? MapChannelTypes<GetOption<Options, Name, ApplicationCommandOptionType.Channel>['channelTypes']>
    : GuildBasedChannel | APIInteractionDataResolvedChannel;

type ResolvedSubcommand<Options extends readonly unknown[]>
  = OptionName<Options, 'Subcommand'> extends never ? string : OptionName<Options, 'Subcommand'>;

type ResolvedSubcommandGroup<Options extends readonly unknown[]>
  = OptionName<Options, 'SubcommandGroup'> extends never ? string : OptionName<Options, 'SubcommandGroup'>;

type ResolveValue<Option, BaseType>
  = Option extends { choices: readonly (infer C)[] } ? (C extends { value: infer V } ? V : C)
  : BaseType;

type ResolvedValue<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType, BaseType>
  = ResolveValue<GetOption<Options, Name, Type>, BaseType>;

// Duplicate `${string}` prevents omitting `get`.
type TypeSafeOptionResolver<Cached extends CacheType = CacheType, Options extends readonly unknown[]> = StrictOmit<
  CommandInteractionOptionResolver<Cached>, `get${string}${string}`
> & {
  /* eslint-disable @typescript-eslint/unified-signatures -- unifying them would result in lost accuracy */
  getString<N extends OptionName<Options, ApplicationCommandOptionType.String>>(
    name: N, required: true
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.String, string>;
  getString<N extends OptionName<Options, ApplicationCommandOptionType.String>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.String, string>
    | (GetOption<Options, N, ApplicationCommandOptionType.String> extends { required: true } ? never : null);
  getString(name: string, required: true): string;
  getString(name: string, required?: boolean): string | null;

  getInteger<N extends OptionName<Options, ApplicationCommandOptionType.Integer>>(
    name: N, required: true
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Integer, number>;
  getInteger<N extends OptionName<Options, ApplicationCommandOptionType.Integer>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Integer, number>
    | (GetOption<Options, N, ApplicationCommandOptionType.Integer> extends { required: true } ? never : null);
  getInteger(name: string, required: true): number;
  getInteger(name: string, required?: boolean): number | null;

  getNumber<N extends OptionName<Options, ApplicationCommandOptionType.Number>>(
    name: N, required: true
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Number, number>;
  getNumber<N extends OptionName<Options, ApplicationCommandOptionType.Number>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Number, number>
    | (GetOption<Options, N, ApplicationCommandOptionType.Number> extends { required: true } ? never : null);
  getNumber(name: string, required: true): number;
  getNumber(name: string, required?: boolean): number | null;

  getBoolean(name: OptionName<Options, ApplicationCommandOptionType.Boolean>, required: true): boolean;
  getBoolean<N extends OptionName<Options, ApplicationCommandOptionType.Boolean>>(
    name: N, required?: boolean
  ): GetOption<Options, N, ApplicationCommandOptionType.Boolean> extends { required: true } ? boolean : boolean | null;
  getBoolean(name: string, required: true): boolean;
  getBoolean(name: string, required?: boolean): boolean | null;

  getUser(name: OptionName<Options, ApplicationCommandOptionType.User>, required: true): User;
  getUser<N extends OptionName<Options, ApplicationCommandOptionType.User>>(
    name: N, required?: boolean
  ): GetOption<Options, N, ApplicationCommandOptionType.User> extends { required: true } ? User : User | null;
  getUser(name: string, required: true): User;
  getUser(name: string, required?: boolean): User | null;

  getMember(name: OptionName<Options, ApplicationCommandOptionType.User>): GuildMember | null;
  getMember(name: string): GuildMember | null;

  getChannel<N extends OptionName<Options, ApplicationCommandOptionType.Channel>>(name: N, required: true, channelTypes?: readonly ChannelType[]):
  ResolvedChannel<Options, N>;
  getChannel<N extends OptionName<Options, ApplicationCommandOptionType.Channel>>(name: N, required: false, channelTypes?: readonly ChannelType[]):
    ResolvedChannel<Options, N>
    | (GetOption<Options, N, ApplicationCommandOptionType.Channel> extends { required: true } ? never : null);
  getChannel<N extends OptionName<Options, ApplicationCommandOptionType.Channel>>(name: N, required?: boolean, channelTypes?: readonly ChannelType[]):
    ResolvedChannel<Options, N>
    | (GetOption<Options, N, ApplicationCommandOptionType.Channel> extends { required: true } ? never : null);
  getChannel(name: string, required: true, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel;
  getChannel(name: string, required: false, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel | null;
  getChannel(name: string, required?: boolean, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel | null;

  getRole(name: OptionName<Options, ApplicationCommandOptionType.Role>, required: true): Role | APIRole;
  getRole<N extends OptionName<Options, ApplicationCommandOptionType.Role>>(
    name: N, required?: boolean
  ): GetOption<Options, N, ApplicationCommandOptionType.Role> extends { required: true } ? Role | APIRole : Role | APIRole | null;
  getRole(name: string, required: true): Role | APIRole;
  getRole(name: string, required?: boolean): Role | APIRole | null;

  getAttachment(name: OptionName<Options, ApplicationCommandOptionType.Attachment>, required: true): Attachment;
  getAttachment<N extends OptionName<Options, ApplicationCommandOptionType.Attachment>>(
    name: N, required?: boolean
  ): GetOption<Options, N, ApplicationCommandOptionType.Attachment> extends { required: true } ? Attachment : Attachment | null;
  getAttachment(name: string, required: true): Attachment;
  getAttachment(name: string, required?: boolean): Attachment | null;

  getMentionable(name: OptionName<Options, ApplicationCommandOptionType.Mentionable>, required: true): User | GuildMember | Role | APIRole;
  getMentionable<N extends OptionName<Options, ApplicationCommandOptionType.Mentionable>>(
    name: N, required?: boolean
  ): User | GuildMember | Role | APIRole
    | (GetOption<Options, N, ApplicationCommandOptionType.Mentionable> extends { required: true } ? never : null);
  getMentionable(name: string, required: true): User | GuildMember | Role | APIRole;
  getMentionable(name: string, required?: boolean): User | GuildMember | Role | APIRole | null;

  getSubcommand(required?: true): ResolvedSubcommand<Options>;
  getSubcommand(required: boolean): ResolvedSubcommand<Options> | null;

  getSubcommandGroup(required?: true): ResolvedSubcommandGroup<Options>;
  getSubcommandGroup(required: boolean): ResolvedSubcommandGroup<Options> | null;
  /* eslint-enable @typescript-eslint/unified-signatures */
};

// #endregion option resolver

// #region option config
type MapToConfig<
  O, CT extends readonly CommandType[], DM extends boolean
>
  = O extends { type: ApplicationCommandOptionType.String } ? StringCommandOptionConfig<CT, DM, never>
  : O extends { type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number } ? NumericCommandOptionConfig<CT, DM, never>
  : O extends { type: ApplicationCommandOptionType.Boolean } ? BooleanCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.User } ? UserCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Channel } ? ChannelCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Role } ? RoleCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Mentionable } ? MentionableCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Attachment } ? AttachmentCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup } ? (
    SubcommandCommandOptionConfig<CT, DM, never, O extends { options: unknown } ? O['options'] : []>
  ) : CommandOptionConfig<CT, DM>;

type ValidateOption<O, CT extends readonly CommandType[], DM extends boolean> = MapToConfig<O, CT, DM> extends infer Config
  ? Config & { [K in keyof O]: K extends keyof Config ? O[K] : never } : never;

type ValidateOptionsArray<
  Arr, CT extends readonly CommandType[], DM extends boolean
> = Arr extends readonly unknown[] ? { [K in keyof Arr]: ValidateOption<Arr[K], CT, DM> } : Arr;


interface BaseOptionConfig {
  name: string;
  type: ApplicationCommandOptionType;
  required?: boolean;

}

interface BasePrimitiveCommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO> extends BaseOptionConfig {
  type: ApplicationCommandOptionType.String | ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;

  strictAutocomplete?: boolean;
  autocompleteOptions?: StrictCommandOption<CT, DM, AO>['autocompleteOptions'];

  choices?: ApplicationCommandOptionChoiceData['value'][];
}

interface SubcommandCommandOptionConfig<
  CT extends readonly CommandType[], DM extends boolean, AO,
  Options extends OptionsG<CT, DM> = readonly DefaultOptionType<CT, DM>[]
> extends StrictOmit<BaseOptionConfig, 'required'>, SharedConfig<DM> {
  type: ApplicationCommandOptionType.SubcommandGroup | ApplicationCommandOptionType.Subcommand;

  options?: ValidateOptionsArray<Options, CT, DM>;

  run?(
    this: ResolveContext<{ slash: ChatInputCommandInteraction<'cached', Options>; prefix: Message }, CT>,
    lang: Translator,
    options: AO,
    client: Client
  ): unknown;
}

interface StringCommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO> extends BasePrimitiveCommandOptionConfig<CT, DM, AO> {
  type: ApplicationCommandOptionType.String;

  minLength?: number;
  maxLength?: number;
}

interface NumericCommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO> extends BasePrimitiveCommandOptionConfig<CT, DM, AO> {
  type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;

  minValue?: number;
  maxValue?: number;
}

interface ChannelCommandOptionConfig extends BaseOptionConfig {
  type: ApplicationCommandOptionType.Channel;

  channelTypes?: ChannelType[];
}

interface BooleanCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Boolean }
interface UserCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.User }
interface RoleCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Role }
interface MentionableCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Mentionable }
interface AttachmentCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Attachment }

export type CommandOptionConfig<
  CT extends readonly CommandType[], DM extends boolean, AO = never,
  Options extends OptionsG<CT, DM> = readonly DefaultOptionType<CT, DM>[]
> = StringCommandOptionConfig<CT, DM, AO>
  | NumericCommandOptionConfig<CT, DM, AO>
  | BooleanCommandOptionConfig
  | UserCommandOptionConfig
  | ChannelCommandOptionConfig
  | RoleCommandOptionConfig
  | MentionableCommandOptionConfig
  | AttachmentCommandOptionConfig
  | SubcommandCommandOptionConfig<CT, DM, AO, Options>;

// #endregion option config

export type RunnableReturns = [key: 'guildOnly']
  | ['paramRequired', { option: string; description: string }]
  | ['invalidChannelType', string]
  | ['strictAutocompleteNoMatch', string]
  | ['strictAutocompleteNoMatchWValues', { option: string; availableOptions: string }];

// #endregion utils

export declare class CommandOption<
  const commandTypes extends readonly CommandType[] = [],
  const runsInDM extends boolean = false,
  const additionalRunOpts = never,
  const Options extends readonly (
    CommandOptionConfig<commandTypes, runsInDM> | StrictCommandOption<commandTypes, runsInDM>
  )[] = readonly DefaultOptionType<commandTypes, runsInDM>[]
> {
  name: Lowercase<string>;
  id: `${string}.options.${CommandOption['name']}`;
  position: number;

  /** Currently not used */
  nameLocalizations?: Partial<Record<Locale, Lowercase<string>>>;
  description: string;
  descriptionLocalizations: Partial<Record<Locale, string>>;

  type: ApplicationCommandOptionType;

  required: boolean;
  cooldowns: { [K in CooldownTypes]: number } & {};
  dmPermission: runsInDM;

  disabled: boolean;
  disabledReason: string | undefined;

  get autocomplete(): boolean;
  strictAutocomplete: boolean;
  autocompleteOptions: autocompleteOptions | autocompleteOptions[] | (
      (
        this: ResolveContext<{ slash: AutocompleteInteraction<'cached'>; prefix: Message }, NoInfer<commandTypes>>,
        query: string
      ) => autocompleteOptions[] | Promise<autocompleteOptions[]>
    ) | undefined;

  choices: ApplicationCommandOptionChoiceData[] | undefined;

  channelTypes: ChannelType[] | undefined;

  minValue?: number;
  maxValue?: number;

  minLength?: number;
  maxLength?: number;

  options: StrictCommandOption<commandTypes, runsInDM>[];

  run: (
    this: ResolveContext<{ slash: ChatInputCommandInteraction<'cached', Options>; prefix: Message }, commandTypes>,
    lang: Translator,
    options: additionalRunOpts, client: Client
  ) => Promise<never>;

  constructor(config: CommandOptionConfig<commandTypes, runsInDM, additionalRunOpts, Options>);

  /* eslint-disable-next-line @typescript-eslint/no-unused-private-class-members */
  private init(i18n: I18nProvider, parentId: Command['id'] | CommandOption['id'], cooldownsManager: CooldownsManager, logger?: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  }, position?: number): this;

  /**
   * @returns the currect cooldown for this subcommand(group) in ms.
   * Resets it if it's `0`. */
  /* eslint-disable-next-line @typescript-eslint/no-unused-private-class-members */
  private updateCooldowns(interaction: ThisParameterType<StrictCommandOption<commandTypes, runsInDM, additionalRunOpts, Options>['run']>): number;

  /* eslint-disable-next-line @typescript-eslint/no-unused-private-class-members */
  private isRunnable(
    interaction: Parameters<customPermissionChecksFn>[0], command: StrictCommand<commandTypes, runsInDM, Options>,
    wrapperTranslator: Translator<false, Locale>, args?: string[]
  ): Exclude<ReturnType<customPermissionChecksFn<StrictCommand<CT, DMInteraction, Options>, RunnableReturns>>, string>;

  /** `translator` and `options` should not be supplied by an external caller. */
  generateAutocomplete(
    interaction: AutocompleteInteraction | Message,
    query: string, locale: Locale, translator?: Translator<true>,
    options?: StrictCommandOption<commandTypes, runsInDM>['autocompleteOptions']
  ): Promise<[] | autocompleteObject[]>;

  isEqualTo(opt: CommandOption<CommandType[], boolean> | ApplicationCommandOption): boolean;
}