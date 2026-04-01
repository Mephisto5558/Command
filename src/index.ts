import type {
  AutocompleteInteraction as _AutocompleteInteraction, CacheType, ChatInputCommandInteraction as _ChatInputCommandInteraction,
  Message as _Message, MessageComponentInteraction as _MessageComponentInteraction, User, _NonNullableFields
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

export declare namespace BetterMS {
  function getMilliseconds<
    T extends validTimeString | number
  >(val: T, options?: { long: boolean }): (T extends string ? number : string) | undefined;
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

export type OptionsG<CT extends readonly CommandType[], DM extends boolean, AO = undefined>
  = readonly (CommandOptionConfig<CT, DM, AO> | CommandOption<CT, DM, AO>)[];
export type DefaultOptionType<CT extends readonly CommandType[], DM extends boolean, AO = undefined>
  = CommandOptionConfig<CT, DM, AO, OptionsG<CT, DM, AO>> | CommandOption<CT, DM, AO, OptionsG<CT, DM, AO>>;

export enum CooldownType {
  Guild = 'guild',
  Channel = 'channel',
  User = 'user'
}
type Cooldowns = Record<CooldownType, validTimeString>;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extending from it */
export interface SharedConfig<DM extends boolean> {
  cooldowns?: Partial<Cooldowns>;

  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;
}

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type
  -- Interfaces intended for cross-package augmentation by the consumer. */
export interface ChatInputCommandInteraction<DM extends boolean = boolean, Options extends readonly unknown[] = []> {
  readonly options: TypeSafeOptionResolver<DM extends false ? 'cached' : CacheType, Options>;
}
export interface Message<DM extends boolean = boolean> {}
export interface AutocompleteInteraction<DM extends boolean = boolean> {}
export interface MessageComponentInteraction<DM extends boolean = boolean> {}

/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type */

export type ResolveContext<MAP, KEYS extends readonly string[]> = MAP[KEYS[number] & keyof MAP];

export type commandDoneFn<cmd extends Command<readonly CommandType[], boolean> = Command<readonly CommandType[], boolean>> = (
  this: ThisParameterType<cmd['run']>,
  command: cmd, lang: Translator<false, Locale>
) => Promise<never>;

/**
 * @returns If a permsision error was found: Parameters for `Translator`
 * @returns If a permission error was handled by the function: `true`
 * @returns If no permission error was found: `false` */
export type customPermissionChecksFn<
  cmd extends Command<readonly CommandType[], boolean> = Command<readonly CommandType[], boolean>,
  RetMsgs extends Parameters<Translator> = Parameters<Translator>
> = ((
  this: cmd, interaction: ThisParameterType<cmd['run']>,
  author: User, translator: Translator<false, Locale>
) => Promise<RetMsgs | boolean>)
| ((
  this: cmd, interaction: ThisParameterType<cmd['run']>,
  author: User, translator: Translator<false, Locale>
) => RetMsgs | boolean);