import type {
  APIInteractionDataResolvedChannel, APIRole, ApplicationCommandOptionChoiceData, ApplicationCommandOptionType,
  Attachment, CacheType, CategoryChannel, ChannelType, Client, CommandInteractionOptionResolver, GuildBasedChannel,
  GuildMember, Message, MessageComponentInteraction, NewsChannel, Role, StageChannel, TextChannel, ThreadChannel, User, VoiceChannel
} from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { ChatInputCommandInteraction, CommandOption, DefaultOptionType, OptionsG, ResolveContext, SharedConfig } from '../../index.ts';
import type { CommandType } from '../utils.ts';

export type autocompleteObject = StrictOmit<ApplicationCommandOptionChoiceData, 'nameLocalizations'>;
export type autocompleteOptions = autocompleteObject['value'] | autocompleteObject;

export type StrictCommandOption<
  CT extends readonly CommandType[], DM extends boolean, AO extends unknown[] = never,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> = CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>>;

// #region option resolver
type GetNamesAtLevel<Opts extends readonly unknown[], TargetType extends ApplicationCommandOptionType>
  = Opts[number] extends infer O
    ? O extends { type: TargetType; name: infer N } ? (N extends string ? N : never) : never
    : never;

type OptionName<Options extends readonly unknown[], Type extends ApplicationCommandOptionType>
  = Options[number] extends infer O
    ? O extends { type: Type; name: infer N } ? (N extends string ? N : never)
    : O extends { type: ApplicationCommandOptionType.SubcommandGroup; options: infer SubGroupOptions } // Recurse into subcommand group
      ? (SubGroupOptions extends readonly unknown[] ? GetNamesAtLevel<SubGroupOptions, Type> : never)
      : O extends { type: ApplicationCommandOptionType.Subcommand; options: infer SubOptions } // Recurse into subcommand
        ? (SubOptions extends readonly unknown[] ? GetNamesAtLevel<SubOptions, Type> : never)
        : never
    : never;

type GetOption<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType>
  = Options[number] extends infer O
    ? O extends { name: Name; type: Type } ? O
    : O extends { type: ApplicationCommandOptionType.SubcommandGroup; options: infer SubGroupOptions } // Recurse into subcommand group
      ? (SubGroupOptions extends readonly unknown[] ? GetOption<SubGroupOptions, Name, Type> : never)
      : O extends { type: ApplicationCommandOptionType.Subcommand; options: infer SubOptions } // Recurse into subcommand
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
  : GuildBasedChannel | APIInteractionDataResolvedChannel;

type MapChannelTypes<Types extends readonly ChannelType[]> = ResolvedChannelType<Types[number]>;

type ResolvedChannel<Options extends readonly unknown[], Name extends string>
  = GetOption<Options, Name, ApplicationCommandOptionType.Channel> extends { channelTypes: readonly ChannelType[] }
    ? MapChannelTypes<GetOption<Options, Name, ApplicationCommandOptionType.Channel>['channelTypes']>
    : GuildBasedChannel | APIInteractionDataResolvedChannel; // Added APIInteractionDataResolvedChannel

type ResolvedSubcommand<Options extends readonly unknown[]> = OptionName<Options, ApplicationCommandOptionType.Subcommand> extends never
  ? string : OptionName<Options, ApplicationCommandOptionType.Subcommand>;

type ResolvedSubcommandGroup<Options extends readonly unknown[]> = OptionName<Options, ApplicationCommandOptionType.SubcommandGroup> extends never
  ? string : OptionName<Options, ApplicationCommandOptionType.SubcommandGroup>;

type ResolveValue<Option, BaseType>
  = Option extends { choices: readonly (infer C)[] } ? (C extends { value: infer V } ? V : C)
  : BaseType;

type ResolvedValue<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType, BaseType>
  = ResolveValue<GetOption<Options, Name, Type>, BaseType>;

// Duplicate `${string}` prevents omitting `get`.
export type TypeSafeOptionResolver<Cached extends CacheType = CacheType, Options extends readonly unknown[] = unknown[]> = StrictOmit<
  CommandInteractionOptionResolver<Cached>, Extract<keyof CommandInteractionOptionResolver<Cached>, `get${string}${string}`>
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
  O, CT extends readonly CommandType[], DM extends boolean>
  = O extends { type: ApplicationCommandOptionType.String } ? StringCommandOptionConfig<CT, DM, never>
  : O extends { type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number } ? NumericCommandOptionConfig<CT, DM, never>
  : O extends { type: ApplicationCommandOptionType.Boolean } ? BooleanCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.User } ? UserCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Channel } ? ChannelCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Role } ? RoleCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Mentionable } ? MentionableCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.Attachment } ? AttachmentCommandOptionConfig
  : O extends { type: ApplicationCommandOptionType.SubcommandGroup } ? SubcommandGroupConfig<CT, DM>
  : O extends { type: ApplicationCommandOptionType.Subcommand } ? SubcommandConfig<CT, DM>
  : PrimitiveCommandOptionConfig<CT, DM>;

type ValidateOption<O, CT extends readonly CommandType[], DM extends boolean> = MapToConfig<O, CT, DM> extends infer Config
  ? Config & { [K in keyof O]: K extends keyof Config ? O[K] : never } : never;

export type ValidateOptionsArray<
  Arr, CT extends readonly CommandType[], DM extends boolean
> = Arr extends readonly unknown[] ? { [K in keyof Arr]: ValidateOption<Arr[K], CT, DM> } : Arr;


type BaseOptionConfig = {
  name: Lowercase<string>;
  type: ApplicationCommandOptionType;
  required?: boolean;
};

type BasePrimitiveCommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO extends unknown[]> = {
  type: ApplicationCommandOptionType.String | ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;

  strictAutocomplete?: boolean;
  autocompleteOptions?: StrictCommandOption<CT, DM, AO>['autocompleteOptions'];
  choices?: ApplicationCommandOptionChoiceData['value'][];
} & BaseOptionConfig;

export type SubcommandConfig<
  CT extends readonly CommandType[], DM extends boolean, AO extends unknown[] = never,
  Options extends readonly (CommandOptionConfig<CT, DM, AO> | StrictCommandOption<CT, DM, AO>)[] = readonly DefaultOptionType<CT, DM, AO>[]> = {
    type: ApplicationCommandOptionType.Subcommand;
    options?: ValidateOptionsArray<Options, CT, DM>;
    run?(
      this: ResolveContext<{
        [CommandType.Slash]: ChatInputCommandInteraction<'cached', Options>;
        [CommandType.Component]: MessageComponentInteraction<'cached'>;
        [CommandType.Prefix]: Message;
      }, CT>,
      lang: Translator<false, Locale>, options: AO, client: Client<true>
    ): unknown;
  } & StrictOmit<BaseOptionConfig, 'required'> & SharedConfig<DM>;

export type SubcommandGroupConfig<
  CT extends readonly CommandType[], DM extends boolean, AO extends unknown[] = never,
  Options extends OptionsG<CT, DM> = readonly DefaultOptionType<CT, DM, AO>[]> = {
    type: ApplicationCommandOptionType.SubcommandGroup;
    options?: ValidateOptionsArray<Options, CT, DM>;
  } & StrictOmit<BaseOptionConfig, 'required'> & SharedConfig<DM>;

export type StringCommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO extends unknown[]> = {
  type: ApplicationCommandOptionType.String;

  minLength?: number;
  maxLength?: number;
} & BasePrimitiveCommandOptionConfig<CT, DM, AO>;

export type NumericCommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO extends unknown[]> = {
  type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;

  minValue?: number;
  maxValue?: number;
} & BasePrimitiveCommandOptionConfig<CT, DM, AO>;

export type ChannelCommandOptionConfig = {
  type: ApplicationCommandOptionType.Channel;

  channelTypes?: ChannelType[];
} & BaseOptionConfig;

type BooleanCommandOptionConfig = { type: ApplicationCommandOptionType.Boolean } & BaseOptionConfig;
type UserCommandOptionConfig = { type: ApplicationCommandOptionType.User } & BaseOptionConfig;
type RoleCommandOptionConfig = { type: ApplicationCommandOptionType.Role } & BaseOptionConfig;
type MentionableCommandOptionConfig = { type: ApplicationCommandOptionType.Mentionable } & BaseOptionConfig;
type AttachmentCommandOptionConfig = { type: ApplicationCommandOptionType.Attachment } & BaseOptionConfig;

export type PrimitiveCommandOptionConfig<CT extends readonly CommandType[], DM extends boolean, AO extends unknown[] = never>
  = | StringCommandOptionConfig<CT, DM, AO>
    | NumericCommandOptionConfig<CT, DM, AO>
    | BooleanCommandOptionConfig
    | UserCommandOptionConfig
    | ChannelCommandOptionConfig
    | RoleCommandOptionConfig
    | MentionableCommandOptionConfig
    | AttachmentCommandOptionConfig;

export type CommandOptionConfig<
  CT extends readonly CommandType[], DM extends boolean, AO extends unknown[] = never,
  Options extends OptionsG<CT, DM> = readonly DefaultOptionType<CT, DM>[]
> = PrimitiveCommandOptionConfig<CT, DM, AO>
  | SubcommandConfig<CT, DM, AO, Options>
  | SubcommandGroupConfig<CT, DM, AO, Options>;

// #endregion option config

export type RunnableReturns = ['guildOnly']
  | ['paramRequired', { option: string; description: string }]
  | ['invalidChannelType', string]
  | ['strictAutocompleteNoMatch', string]
  | ['strictAutocompleteNoMatchWValues', { option: string; availableOptions: string }];