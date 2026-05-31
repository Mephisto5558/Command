import type {
  APIInteractionDataResolvedChannel, APIRole, ApplicationCommandOptionChoiceData, ApplicationCommandOptionType,
  Attachment, CacheType, Channel, ChannelType, Client, CommandInteractionOptionResolver, GuildBasedChannel,
  GuildMember, Message as _Message, Role, User
} from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type {
  AllContexts, AutocompleteInteraction, ChatInputCommandInteraction, Command, CommandOption, Message, MessageComponentInteraction,
  OptionsG, SharedConfig
} from '../../index.ts';
import type { CommandType } from '../utils.ts';

export type autocompleteObject = Pick<ApplicationCommandOptionChoiceData, 'name' | 'value'>;
export type autocompleteOption = autocompleteObject['value'] | autocompleteObject;
export type autocompleteFunction<CT extends readonly CommandType[], CTX extends AllContexts> = (
  this: ExtendsMultiMatch<CommandType, CT, [
    [CommandType.Slash, AutocompleteInteraction<NoInfer<CTX>>],
    [CommandType.Prefix, Message<NoInfer<CTX>>]
  ]>,
  query: string
) => autocompleteOption[] | Promise<autocompleteOption[]>;

export type autocompleteOptions<CT extends readonly CommandType[], CTX extends AllContexts>
  = autocompleteOption | autocompleteOption[] | autocompleteFunction<CT, CTX>;

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
  = O extends { name: infer ON; type: infer T }
    ? IfExtendsStrict<Type, T, {
      ifTrue: IfExtends<string, ON, {
        ifTrue: O; // Handles JS broad string inference
        ifFalse: IfExtends<ON, Name, { ifTrue: O }>;
      }>;
    }>
    : never;

type GetNamesAtLevel<Opts extends readonly unknown[], TargetType extends ApplicationCommandOptionType>
  = ExtractOptionName<Opts[number], TargetType>;

type OptionName<Options extends readonly unknown[], Type extends ApplicationCommandOptionType>
  = | ExtractOptionName<Options[number], Type>
    | ExtractOptionName<GetSubOpts<Options[number]>, Type>
    | ExtractOptionName<GetSubOpts<GetSubOpts<Options[number]>>, Type>;

type GetOption<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType>
  = | ExtractGetOption<Options[number], Name, Type>
    | ExtractGetOption<GetSubOpts<Options[number]>, Name, Type>
    | ExtractGetOption<GetSubOpts<GetSubOpts<Options[number]>>, Name, Type>;

export type MapChannelTypes<CT extends readonly ChannelType[]> = ShallowPrettify<Extract<Channel, { type: CT[number] }>>;

type ResolvedDefaultChannel = GuildBasedChannel | APIInteractionDataResolvedChannel;
type ResolvedChannel<Options extends readonly unknown[], Name extends string>
  = [GetOption<Options, Name, ApplicationCommandOptionType.Channel>] extends [never]
    ? ResolvedDefaultChannel
    : GetOption<Options, Name, ApplicationCommandOptionType.Channel> extends { channelTypes: infer CT extends readonly ChannelType[] }
      ? [CT[number]] extends [never]
          ? ResolvedDefaultChannel
          : MapChannelTypes<CT>
      : ResolvedDefaultChannel;

type ResolvedSubcommand<Options extends readonly unknown[]> = IfExtendsNever<
  OptionName<Options, ApplicationCommandOptionType.Subcommand>,
  { ifTrue: string; ifFalse: OptionName<Options, ApplicationCommandOptionType.Subcommand> }
>;

type ResolvedSubcommandGroup<Options extends readonly unknown[]> = IfExtendsNever<
  OptionName<Options, ApplicationCommandOptionType.SubcommandGroup>,
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

type ResolvedValue<
  Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType, BaseType
> = IfExtendsNever<GetOption<Options, Name, Type>, {
  ifTrue: BaseType;
  ifFalse: ResolveValue<GetOption<Options, Name, Type>, BaseType>;
}>;

export type FallbackChannels<CT extends readonly CommandType[], CTX extends AllContexts>
  = ExtendsMultiMatch<CommandType, CT, [
    [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>>],
    [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>> & { commandName: Command['name'] }],
    [CommandType.Prefix, Message<NoInfer<CTX>>]
  ]>['channel'];

type IsRequired<Options extends readonly unknown[], Name extends string, Type extends ApplicationCommandOptionType>
  = Not<ExtendsNever<Extract<Options[number], { name: Name; type: Type; required: true }>>>;

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
interface BaseOptionConfig {
  name: Lowercase<string>;
}

interface BaseSubcommandConfig<
  CTX extends AllContexts
> extends SharedConfig<CTX>, BaseOptionConfig {}

interface BasePrimitiveCommandOptionConfig<CT extends readonly CommandType[], CTX extends AllContexts>
  extends BaseOptionConfig {
  required?: boolean;
  strictAutocomplete?: boolean;
  autocompleteOptions?: autocompleteOptions<CT, CTX>;
  choices?: readonly ApplicationCommandOptionChoiceData['value'][];
}

export interface SubcommandGroupConfig<
  CT extends readonly CommandType[], CTX extends AllContexts, AO = never,
  ChildrenOptions extends readonly SubcommandConfig<CT, CTX, unknown>[]
  /* | readonly CommandOption<CT, CTX, AO>[] */ = readonly SubcommandConfig<CT, CTX, unknown>[]
  // | readonly CommandOption<CT, CTX, AO>[]
> extends BaseSubcommandConfig<CTX> {
  type: ApplicationCommandOptionType.SubcommandGroup;
  options: ChildrenOptions;

  run?(
    this: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>> & { commandName: Command['name'] }],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    lang: Translator<false, Locale>, options: NoInfer<AO>,
    data: {
      client: Client<true>;
      option: CommandOption<CT, CTX, AO, ChildrenOptions, ApplicationCommandOptionType.SubcommandGroup>;
    }
  ): unknown;
}

export interface SubcommandConfig<
  CT extends readonly CommandType[], CTX extends AllContexts, AO = undefined,
  ChildrenOptions extends (
    readonly PrimitiveCommandOptionConfig<CT, CTX>[] // | readonly CommandOption<CT, CTX, AO, never, PrimitiveCommandOptionConfig<CT, CTX>['type']>[]
  ) = (
    readonly PrimitiveCommandOptionConfig<CT, CTX>[] // | readonly CommandOption<CT, CTX, AO, never, PrimitiveCommandOptionConfig<CT, CTX>['type']>[]
  )
> extends BaseSubcommandConfig<CTX> {
  type: ApplicationCommandOptionType.Subcommand;
  options?: ChildrenOptions;

  run?(
    this: ExtendsMultiMatch<CommandType, CT, [
      [CommandType.Slash, ChatInputCommandInteraction<NoInfer<CTX>, NoInfer<ChildrenOptions>>],
      [CommandType.Component, MessageComponentInteraction<NoInfer<CTX>> & { commandName: Command['name'] }],
      [CommandType.Prefix, Message<NoInfer<CTX>>]
    ]>,
    lang: Translator<false, Locale>, options: NoInfer<AO>,
    data: {
      client: Client<true>;
      option: CommandOption<CT, CTX, AO, ChildrenOptions, ApplicationCommandOptionType.Subcommand>;
    }
  ): unknown;
}

export interface StringCommandOptionConfig<CT extends readonly CommandType[], CTX extends AllContexts>
  extends BasePrimitiveCommandOptionConfig<CT, CTX> {
  type: ApplicationCommandOptionType.String;

  minLength?: number;
  maxLength?: number;
}

export interface NumericCommandOptionConfig<
  CT extends readonly CommandType[], CTX extends AllContexts,
  T extends (
    ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
  ) = ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
> extends BasePrimitiveCommandOptionConfig<CT, CTX> {
  type: T;

  minValue?: number;
  maxValue?: number;
}

export interface ChannelCommandOptionConfig extends BaseOptionConfig {
  type: ApplicationCommandOptionType.Channel;

  channelTypes?: readonly ChannelType[];
}

interface BooleanCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Boolean }
interface UserCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.User }
interface RoleCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Role }
interface MentionableCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Mentionable }
interface AttachmentCommandOptionConfig extends BaseOptionConfig { type: ApplicationCommandOptionType.Attachment }

export type PrimitiveCommandOptionConfig<CT extends readonly CommandType[], CTX extends AllContexts>
  = StringCommandOptionConfig<CT, CTX>
    | NumericCommandOptionConfig<CT, CTX>
    | BooleanCommandOptionConfig
    | UserCommandOptionConfig
    | ChannelCommandOptionConfig
    | RoleCommandOptionConfig
    | MentionableCommandOptionConfig
    | AttachmentCommandOptionConfig;

export type CommandOptionConfig<
  CT extends readonly CommandType[], CTX extends AllContexts, AO = undefined,
  Options extends OptionsG<CT, CTX, AO> = OptionsG<CT, CTX, AO>
> = StringCommandOptionConfig<CT, CTX>
  | NumericCommandOptionConfig<CT, CTX>
  | BooleanCommandOptionConfig
  | UserCommandOptionConfig
  | ChannelCommandOptionConfig
  | RoleCommandOptionConfig
  | MentionableCommandOptionConfig
  | AttachmentCommandOptionConfig
  | SubcommandConfig<CT, CTX, AO, Options>
  | SubcommandGroupConfig<CT, CTX, AO, Options>;

// #endregion option config

export type RunnableReturns = ['guildOnly']
  | ['paramRequired', { option: string; description: string }]
  | ['invalidChannelType', string]
  | ['strictAutocompleteNoMatch', string]
  | ['strictAutocompleteNoMatchWValues', { option: string; availableOptions: string }];

type PrivateAutocompleteGeneratorOptions<CT extends readonly CommandType[], CTX extends AllContexts> = [
  translator?: Translator<true, Locale>,
  options?: autocompleteOptions<NoInfer<CT>, NoInfer<CTX>>
];

export type PublicAutocompleteGeneratorOptions<CT extends readonly CommandType[], CTX extends AllContexts> = [
  interaction: ExtendsMultiMatch<CommandType, CT, [
    [CommandType.Slash, AutocompleteInteraction<NoInfer<CTX>>],
    [CommandType.Prefix, Message<NoInfer<CTX>>]
  ]>,
  query: string, locale: Locale
];

export type AutocompleteGeneratorOptions<CT extends readonly CommandType[], CTX extends AllContexts> = [
  ...PublicAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>,
  ...PrivateAutocompleteGeneratorOptions<NoInfer<CT>, NoInfer<CTX>>
];