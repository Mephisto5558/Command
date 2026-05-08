import type {
  APIInteractionDataResolvedChannel, APIRole, ApplicationCommandOptionChoiceData, ApplicationCommandOptionType,
  Attachment, CacheType, CategoryChannel, ChannelType, Client, CommandInteractionOptionResolver, GuildBasedChannel,
  GuildMember, Message as _Message, NewsChannel, Role, StageChannel, TextChannel, ThreadChannel, User, VoiceChannel
} from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type {
  AutocompleteInteraction, ChatInputCommandInteraction, CommandOption, DMPermType, Message, MessageComponentInteraction,
  OptionsG, SharedConfig
} from '../../index.ts';
import type { CommandType } from '../utils.ts';

export type autocompleteObject = Pick<ApplicationCommandOptionChoiceData, 'name' | 'value'>;
export type autocompleteOption = autocompleteObject['value'] | autocompleteObject;
export type autocompleteFunction<CT extends readonly CommandType[], DM extends DMPermType> = (
  this: ExtendsMultiMatch<CT, [
    [CommandType.Slash, AutocompleteInteraction<NoInfer<DM>>],
    [CommandType.Prefix, Message<NoInfer<DM>>]
  ]>,
  query: string
) => autocompleteOption[] | Promise<autocompleteOption[]>;

export type autocompleteOptions<CT extends readonly CommandType[], DM extends DMPermType>
  = autocompleteOption | autocompleteOption[] | autocompleteFunction<NoInfer<CT>, NoInfer<DM>>;

// #region option resolver
type GetSubOpts<O>
  = O extends { options?: infer Sub extends readonly unknown[] }
    ? Sub[number]
    : never;

type ExtractOptionName<O, Type extends ApplicationCommandOptionType>
  = O extends { name: infer N extends string; type: Type }
    ? N
    : never;

type ExtractGetOption<O, Name extends string, Type extends ApplicationCommandOptionType>
  = Extract<O, { name: Name; type: Type }>;

type GetNamesAtLevel<Opts extends readonly unknown[], TargetType extends ApplicationCommandOptionType>
  = ExtractOptionName<Opts[number], TargetType>;

type OptionName<Options extends readonly unknown[], Type extends ApplicationCommandOptionType>
  = ExtractOptionName<Options[number], Type>
    | ExtractOptionName<GetSubOpts<Options[number]>, Type>
    | ExtractOptionName<GetSubOpts<GetSubOpts<Options[number]>>, Type>;

type GetOption<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType>
  = ExtractGetOption<Options[number], Name, Type>
    | ExtractGetOption<GetSubOpts<Options[number]>, Name, Type>
    | ExtractGetOption<GetSubOpts<GetSubOpts<Options[number]>>, Name, Type>;

type ResolvedChannelType<T extends ChannelType> = ExtendsMatch<T, [
  [ChannelType.GuildText, TextChannel],
  [ChannelType.GuildVoice, VoiceChannel],
  [ChannelType.GuildCategory, CategoryChannel],
  [ChannelType.GuildAnnouncement, NewsChannel],
  [ChannelType.GuildStageVoice, StageChannel],
  [ChannelType.PublicThread | ChannelType.PrivateThread | ChannelType.AnnouncementThread, ThreadChannel]
], GuildBasedChannel | APIInteractionDataResolvedChannel>;

type MapChannelTypes<Types extends readonly ChannelType[]> = ResolvedChannelType<Types[number]>;

type ResolvedChannel<Options extends readonly unknown[], Name extends string> = IfExtendsStrict<
  GetOption<Options, Name, ApplicationCommandOptionType.Channel>, { channelTypes: readonly ChannelType[] }, {
    ifTrue: MapChannelTypes<
      Extract<GetOption<Options, Name, ApplicationCommandOptionType.Channel>, { channelTypes: readonly ChannelType[] }>['channelTypes']
    >; ifFalse: GuildBasedChannel | APIInteractionDataResolvedChannel;
  }
>;

type ResolvedSubcommand<Options extends readonly unknown[]> = IfExtends<OptionName<Options, ApplicationCommandOptionType.Subcommand>, never,
  { ifTrue: string; ifFalse: OptionName<Options, ApplicationCommandOptionType.Subcommand> }
>;

type ResolvedSubcommandGroup<Options extends readonly unknown[]> = IfExtends<OptionName<Options, ApplicationCommandOptionType.SubcommandGroup>, never,
  { ifTrue: string; ifFalse: OptionName<Options, ApplicationCommandOptionType.SubcommandGroup> }
>;

type ResolveChoiceValue<T> = T extends { value: infer V } ? V : T;

type ResolveValue<Option, BaseType> = Match<[
  [
    Extends<Option, { choices: readonly unknown[] }>,
    ResolveChoiceValue<Extract<Option, { choices: readonly unknown[] }>['choices'][number]>
  ],
  [
    Extends<Option, { strictAutocomplete: true; autocompleteOptions: readonly autocompleteOption[] }>,
    ResolveChoiceValue<
      Extract<Option, { strictAutocomplete: true; autocompleteOptions: readonly autocompleteOption[] }>['autocompleteOptions'][number]
    >
  ]
], BaseType>;

type ResolvedValue<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType, BaseType> = IfExtends<
  GetOption<Options, Name, Type>, never, {
    ifTrue: BaseType;
    ifFalse: ResolveValue<GetOption<Options, Name, Type>, BaseType>;
  }
>;

type IsRequired<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType>
  = Not<Extends<Extract<Options[number], { name: Name; type: Type; required: true }>, never>>;

export type TypeSafeOptionResolver<Cached extends CacheType = CacheType, Options extends readonly unknown[] = unknown[]> = StrictOmit<
  CommandInteractionOptionResolver<Cached>, Extract<keyof CommandInteractionOptionResolver<Cached>, `get${string}${string}`>
> & {
  /* eslint-disable @typescript-eslint/no-unnecessary-type-parameters -- consistency */

  // --- STRING ---
  getString<N extends OptionName<Options, ApplicationCommandOptionType.String>>(
    name: N, required: true
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.String, string>;
  getString<N extends OptionName<Options, ApplicationCommandOptionType.String>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.String, string>
    | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.String>, false, { ifTrue: null }>;
  getString(name: string, required: true): string;
  getString(name: string, required?: boolean): string | null;

  // --- INTEGER ---
  getInteger<N extends OptionName<Options, ApplicationCommandOptionType.Integer>>(
    name: N, required: true
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Integer, number>;
  getInteger<N extends OptionName<Options, ApplicationCommandOptionType.Integer>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Integer, number>
    | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.Integer>, false, { ifTrue: null }>;
  getInteger(name: string, required: true): number;
  getInteger(name: string, required?: boolean): number | null;

  // --- NUMBER ---
  getNumber<N extends OptionName<Options, ApplicationCommandOptionType.Number>>(
    name: N, required: true
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Number, number>;
  getNumber<N extends OptionName<Options, ApplicationCommandOptionType.Number>>(
    name: N, required?: boolean
  ): ResolvedValue<Options, N, ApplicationCommandOptionType.Number, number>
    | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.Number>, false, { ifTrue: null }>;
  getNumber(name: string, required: true): number;
  getNumber(name: string, required?: boolean): number | null;

  // --- BOOLEAN ---
  getBoolean<N extends OptionName<Options, ApplicationCommandOptionType.Boolean>>(
    name: N, required: true
  ): boolean;
  getBoolean<N extends OptionName<Options, ApplicationCommandOptionType.Boolean>>(
    name: N, required?: boolean
  ): boolean | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.Boolean>, false, { ifTrue: null }>;
  getBoolean(name: string, required: true): boolean;
  getBoolean(name: string, required?: boolean): boolean | null;

  // --- USER / MEMBER ---
  getUser<N extends OptionName<Options, ApplicationCommandOptionType.User>>(
    name: N, required: true
  ): User;
  getUser<N extends OptionName<Options, ApplicationCommandOptionType.User>>(
    name: N, required?: boolean
  ): User | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.User>, false, { ifTrue: null }>;
  getUser(name: string, required: true): User;
  getUser(name: string, required?: boolean): User | null;

  getMember(name: OptionName<Options, ApplicationCommandOptionType.User> | string): GuildMember | null;

  // --- CHANNEL ---
  getChannel<N extends OptionName<Options, ApplicationCommandOptionType.Channel>>(
    name: N, required: true, channelTypes?: readonly ChannelType[]
  ): ResolvedChannel<Options, N>;
  getChannel<N extends OptionName<Options, ApplicationCommandOptionType.Channel>>(
    name: N, required?: boolean, channelTypes?: readonly ChannelType[]
  ): ResolvedChannel<Options, N> | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.Channel>, true, { ifFalse: null }>;
  getChannel(name: string, required: true, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel;
  getChannel(name: string, required?: boolean, channelTypes?: readonly ChannelType[]): GuildBasedChannel | APIInteractionDataResolvedChannel | null;

  // --- ROLE ---
  getRole<N extends OptionName<Options, ApplicationCommandOptionType.Role>>(
    name: N, required: true
  ): Role | APIRole;
  getRole<N extends OptionName<Options, ApplicationCommandOptionType.Role>>(
    name: N, required?: boolean
  ): Role | APIRole | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.Role>, true, { ifFalse: null }>;
  getRole(name: string, required: true): Role | APIRole;
  getRole(name: string, required?: boolean): Role | APIRole | null;

  // --- ATTACHMENT ---
  getAttachment<N extends OptionName<Options, ApplicationCommandOptionType.Attachment>>(name: N, required: true): Attachment;
  getAttachment<N extends OptionName<Options, ApplicationCommandOptionType.Attachment>>(
    name: N, required?: boolean
  ): Attachment | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.Attachment>, true, { ifFalse: null }>;
  getAttachment(name: string, required: true): Attachment;
  getAttachment(name: string, required?: boolean): Attachment | null;

  // --- MENTIONABLE ---
  getMentionable<N extends OptionName<Options, ApplicationCommandOptionType.Mentionable>>(
    name: N, required: true
  ): User | GuildMember | Role | APIRole;
  getMentionable<N extends OptionName<Options, ApplicationCommandOptionType.Mentionable>>(
    name: N, required?: boolean
  ): User | GuildMember | Role | APIRole
    | IfExtendsStrict<IsRequired<Options, N, ApplicationCommandOptionType.Mentionable>, true, { ifFalse: null }>;
  getMentionable(name: string, required: true): User | GuildMember | Role | APIRole;
  getMentionable(name: string, required?: boolean): User | GuildMember | Role | APIRole | null;

  // --- SUBCOMMANDS ---
  getSubcommand(required?: true): ResolvedSubcommand<Options>;
  getSubcommand(required: boolean): ResolvedSubcommand<Options> | null;

  getSubcommandGroup(required?: true): ResolvedSubcommandGroup<Options>;
  getSubcommandGroup(required: boolean): ResolvedSubcommandGroup<Options> | null;

  readonly subcommand: {
    [K in GetNamesAtLevel<Options, ApplicationCommandOptionType.Subcommand>]: TypeSafeOptionResolver<Cached,
      [Extract<Options[number], { name: K }>] extends [{ options: infer O extends readonly unknown[] }] ? O : []
    >
  };

  /* eslint-enable @typescript-eslint/no-unnecessary-type-parameters */
};

// #endregion option resolver

// #region option config
type MapToConfig<
  O extends { type: ApplicationCommandOptionType },
  CT extends readonly CommandType[], DM extends DMPermType
> = ExtendsMatch<O['type'], [
  [ApplicationCommandOptionType.String, StringCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>],
  [ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number, NumericCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>],
  [ApplicationCommandOptionType.Boolean, BooleanCommandOptionConfig],
  [ApplicationCommandOptionType.User, UserCommandOptionConfig],
  [ApplicationCommandOptionType.Channel, ChannelCommandOptionConfig],
  [ApplicationCommandOptionType.Role, RoleCommandOptionConfig],
  [ApplicationCommandOptionType.Mentionable, MentionableCommandOptionConfig],
  [ApplicationCommandOptionType.Attachment, AttachmentCommandOptionConfig],
  [ApplicationCommandOptionType.SubcommandGroup, SubcommandGroupConfig<NoInfer<CT>, NoInfer<DM>>],
  [ApplicationCommandOptionType.Subcommand, SubcommandConfig<NoInfer<CT>, NoInfer<DM>>]
], PrimitiveCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>>;

type ValidateOption<O extends { type: ApplicationCommandOptionType }, CT extends readonly CommandType[], DM extends DMPermType>
  = MapToConfig<NoInfer<O>, NoInfer<CT>, NoInfer<DM>> & StrictPick<O, MapToConfig<NoInfer<O>, NoInfer<CT>, NoInfer<DM>>>;

export type ValidateOptionsArray<
  Arr extends readonly { type: ApplicationCommandOptionType }[],
  CT extends readonly CommandType[], DM extends DMPermType
> = IfExtends<Arr, readonly unknown[],
  {
    ifTrue: { [K in keyof Arr]: ValidateOption<Arr[K], NoInfer<CT>, NoInfer<DM>> };
    ifFalse: Arr;
  }
>;

type BaseOptionConfig = {
  name: Lowercase<string>;
  type: ApplicationCommandOptionType;
  required?: boolean;
};

type BasePrimitiveCommandOptionConfig<CT extends readonly CommandType[], DM extends DMPermType> = {
  type: ApplicationCommandOptionType.String | ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;

  strictAutocomplete?: boolean;
  autocompleteOptions?: autocompleteOptions<NoInfer<CT>, NoInfer<DM>>;
  choices?: readonly ApplicationCommandOptionChoiceData['value'][];
} & BaseOptionConfig;

type BaseSubcommandConfig<CT extends readonly CommandType[], DM extends DMPermType, AO, Options extends OptionsG<CT, DM, AO>> = {
  dmPermission?: DM;
  options?: ValidateOptionsArray<NoInfer<Options>, NoInfer<CT>, NoInfer<DM>>;

  run?(
    this: ExtendsMultiMatch<CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<DM>, NoInfer<Options>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<DM>>],
      [CommandType.Prefix, Message<NoInfer<DM>>]
    ]>,
    lang: Translator<false, Locale>, options: NoInfer<AO>,
    data: {
      client: Client<true>;
      option: CommandOption<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>>
        & SubcommandConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>>;
    }
  ): unknown;
};

export type SubcommandConfig<
  CT extends readonly CommandType[], DM extends DMPermType, AO = undefined,
  Options extends OptionsG<CT, DM, AO> = OptionsG<CT, DM, AO>
> = { type: ApplicationCommandOptionType.Subcommand }
  & StrictOmit<BaseOptionConfig, 'required'>
  & BaseSubcommandConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>> & SharedConfig<NoInfer<DM>>;

export type SubcommandGroupConfig<
  CT extends readonly CommandType[], DM extends DMPermType, AO = undefined,
  Options extends OptionsG<CT, DM, AO> = OptionsG<CT, DM, AO>
> = { type: ApplicationCommandOptionType.SubcommandGroup }
  & StrictOmit<BaseOptionConfig, 'required'>
  & BaseSubcommandConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>> & SharedConfig<NoInfer<DM>>;

export type StringCommandOptionConfig<CT extends readonly CommandType[], DM extends DMPermType> = {
  type: ApplicationCommandOptionType.String;

  minLength?: number;
  maxLength?: number;
} & BasePrimitiveCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>;

export type NumericCommandOptionConfig<
  CT extends readonly CommandType[], DM extends DMPermType,
  T extends (
    ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
  ) = ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
> = {
  type: T;

  minValue?: number;
  maxValue?: number;
} & BasePrimitiveCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>;

export type ChannelCommandOptionConfig = {
  type: ApplicationCommandOptionType.Channel;

  channelTypes?: readonly ChannelType[];
} & BaseOptionConfig;

type BooleanCommandOptionConfig = { type: ApplicationCommandOptionType.Boolean } & BaseOptionConfig;
type UserCommandOptionConfig = { type: ApplicationCommandOptionType.User } & BaseOptionConfig;
type RoleCommandOptionConfig = { type: ApplicationCommandOptionType.Role } & BaseOptionConfig;
type MentionableCommandOptionConfig = { type: ApplicationCommandOptionType.Mentionable } & BaseOptionConfig;
type AttachmentCommandOptionConfig = { type: ApplicationCommandOptionType.Attachment } & BaseOptionConfig;

export type PrimitiveCommandOptionConfig<CT extends readonly CommandType[], DM extends DMPermType>
  = | StringCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>
    | NumericCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>
    | BooleanCommandOptionConfig
    | UserCommandOptionConfig
    | ChannelCommandOptionConfig
    | RoleCommandOptionConfig
    | MentionableCommandOptionConfig
    | AttachmentCommandOptionConfig;

export type CommandOptionConfig<
  CT extends readonly CommandType[], DM extends DMPermType, AO = undefined,
  Options extends OptionsG<CT, DM, AO> = OptionsG<CT, DM, AO>
> = PrimitiveCommandOptionConfig<NoInfer<CT>, NoInfer<DM>>
  | SubcommandConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>>
  | SubcommandGroupConfig<NoInfer<CT>, NoInfer<DM>, NoInfer<AO>, NoInfer<Options>>;

// #endregion option config

export type RunnableReturns = ['guildOnly']
  | ['paramRequired', { option: string; description: string }]
  | ['invalidChannelType', string]
  | ['strictAutocompleteNoMatch', string]
  | ['strictAutocompleteNoMatchWValues', { option: string; availableOptions: string }];

type PrivateAutocompleteGeneratorOptions<CT extends readonly CommandType[], DM extends DMPermType> = [
  translator?: Translator<true, Locale>,
  options?: autocompleteOptions<NoInfer<CT>, NoInfer<DM>>
];

export type PublicAutocompleteGeneratorOptions<CT extends readonly CommandType[], DM extends DMPermType> = [
  interaction: ExtendsMultiMatch<CT, [
    [CommandType.Slash, AutocompleteInteraction<NoInfer<DM>>],
    [CommandType.Prefix, Message<NoInfer<DM>>]
  ]>,
  query: string, locale: Locale
];

export type AutocompleteGeneratorOptions<CT extends readonly CommandType[], DM extends DMPermType> = [
  ...PublicAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>,
  ...PrivateAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<DM>>
];