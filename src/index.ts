/* eslint-disable-next-line import-x/no-unassigned-import, import-x/no-empty-named-blocks, unicorn/require-module-specifiers -- load global types */
import type {} from '@mephisto5558/better-types';

/* eslint-disable-next-line import-x/order -- side-effect import first */
import type {
  APIInteractionGuildMember, AutocompleteInteraction as _AutocompleteInteraction, ChatInputCommandInteraction as _ChatInputCommandInteraction,
  Message as _Message, MessageComponentInteraction as _MessageComponentInteraction, PartialDMChannel, PartialGroupDMChannel, User, _NonNullableFields
} from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { Command } from './classes/command/index.ts';
import type { CommandOption } from './classes/commandOption/index.ts';
import type { CommandOptionConfig, TypeSafeOptionResolver } from './classes/commandOption/utils.ts';
import type { CommandType } from './classes/utils.ts';

export * from './utils/index.ts';
export { Command } from './classes/command/index.ts';
export { CommandOption } from './classes/commandOption/index.ts';
export { CommandManager } from './classes/commandManager/index.ts';
export { CommandExecutionError, CommandType } from './classes/utils.ts';
export {
  PermissionFlagsBits as Permission,
  ApplicationCommandOptionType as OptionType
} from 'discord.js';

export enum PermissionType {
  Client = 0,
  Role = 1,
  User = 2,
  Channel = 3
}

export enum DMPermType {
  CanBeDM = 0,
  NeverDM = 1,
  OnlyDM = 2
}

export type DMPermTypeToCaching = {
  /* This is the real behavior, but CacheType "raw" is an edge case which is not implemented for simplicity sake.
     [DMPermType.CanBeDM]: CacheType; */

  [DMPermType.CanBeDM]: 'cached' | undefined;
  [DMPermType.NeverDM]: 'cached';
  [DMPermType.OnlyDM]: undefined;
};
export type DMPermTypeToInGuild = {
  [DMPermType.CanBeDM]: boolean;
  [DMPermType.NeverDM]: true;
  [DMPermType.OnlyDM]: false;
};

export declare namespace BetterMS {
  function getMilliseconds<
    T extends validTimeString | number
  >(val: T, options?: { long: boolean }): If<Extends<T, string>, { ifTrue: number; ifFalse: string }> | undefined;
}

type BuildOrderedCooldown<T extends readonly string[]> = T extends [infer Head extends string, ...infer Tail extends string[]]
  ? `${number}${Head}` | `${number}${Head}${BuildOrderedCooldown<Tail>}` | BuildOrderedCooldown<Tail>
  : never;

/**
 * This is more limited than what's actually allowed to enforce consitency.
 *
 * day, hour, minute, second, millisecond */
type TimeUnits = ['d', 'h', 'min', 's', 'ms'];
export type validTimeString = BuildOrderedCooldown<TimeUnits>;

export type Logger = {
  debug: typeof console.debug;
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
};

export type OptionsG<CT extends readonly CommandType[], DM extends DMPermType, AO = undefined>
  = readonly (CommandOptionConfig<CT, DM, AO> | CommandOption<CT, DM, AO>)[];
export type DefaultOptionType<CT extends readonly CommandType[], DM extends DMPermType, AO = undefined>
  = CommandOptionConfig<CT, DM, AO, OptionsG<CT, DM, AO>> | CommandOption<CT, DM, AO, OptionsG<CT, DM, AO>>;

export enum CooldownType {
  Guild = 'guild',
  Channel = 'channel',
  User = 'user'
}
type Cooldowns = Record<CooldownType, validTimeString>;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extending from it */
export interface SharedConfig<DM extends DMPermType> {
  cooldowns?: Partial<Cooldowns>;

  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;
}

// Excluding APIInteractionGuildMember because it's an edge case and annoying for now.
type Member<DM extends DMPermType, T extends _Message | _ChatInputCommandInteraction> = ExtendsMatch<DM, [
  [DMPermType.CanBeDM, NonNullable<Exclude<T['member'], APIInteractionGuildMember>> | null],
  [DMPermType.NeverDM, NonNullable<Exclude<T['member'], APIInteractionGuildMember>>],
  [DMPermType.OnlyDM, null]
], unknown>;

// Channel may be null or partial in reality, but with the right Partials and Intents it won't.
type InteractionChannel<
  DM extends DMPermType, T1 extends _Message | _ChatInputCommandInteraction, T2 extends _Message | _ChatInputCommandInteraction
> = Exclude<NonNullable<ExtendsMatch<DM, [
  [DMPermType.NeverDM, T1['channel']],
  [DMPermType.OnlyDM, T2['channel']],
  [DMPermType.CanBeDM, (T1 | T2)['channel']]
], unknown>>, PartialDMChannel | PartialGroupDMChannel>;


/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-unnecessary-type-parameters
  -- Intended for cross-package augmentation by the consumer. */
export declare class ChatInputCommandInteraction<DM extends DMPermType = DMPermType.CanBeDM, Options extends readonly unknown[] = []> {
  readonly member: Member<DM, _ChatInputCommandInteraction<'cached'>>;
  readonly channel: InteractionChannel<
    DM, _ChatInputCommandInteraction<DMPermTypeToCaching[DMPermType.NeverDM]>,
    _ChatInputCommandInteraction<DMPermTypeToCaching[DMPermType.OnlyDM]>
  >;

  readonly options: TypeSafeOptionResolver<DMPermTypeToCaching[DM], Options>;
}
export declare class Message<DM extends DMPermType = DMPermType.CanBeDM> {
  readonly member: Member<DM, _Message>;
  readonly channel: InteractionChannel<
    DM, _Message<DMPermTypeToInGuild[DMPermType.NeverDM]>,
    _Message<DMPermTypeToInGuild[DMPermType.OnlyDM]>
  >;
}

export declare class AutocompleteInteraction<DM extends DMPermType = DMPermType.CanBeDM> {}
export declare class MessageComponentInteraction<DM extends DMPermType = DMPermType.CanBeDM> {}

/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-unnecessary-type-parameters */

export type commandDoneFn<cmd extends Command<readonly CommandType[], DMPermType> = Command<readonly CommandType[], DMPermType>> = (
  this: ThisParameterType<cmd['run']>,
  command: cmd, lang: Translator<false, Locale>
) => Promise<never>;

/**
 * @returns If a permsision error was found: Parameters for `Translator`
 * @returns If a permission error was handled by the function: `true`
 * @returns If no permission error was found: `false` */
export type customPermissionChecksFn<
  cmd extends Command<readonly CommandType[], DMPermType> = Command<readonly CommandType[], DMPermType>,
  RetMsgs extends Parameters<Translator> = Parameters<Translator>
> = (
  this: cmd, interaction: ThisParameterType<cmd['run']>,
  author: User, translator: Translator<false, Locale>
) => RetMsgs | boolean | Promise<RetMsgs | boolean>;