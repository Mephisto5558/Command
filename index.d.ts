/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type { CacheType, ChatInputCommandInteraction as _ChatInputCommandInteraction, User, _NonNullableFields } from 'discord.js';
import type * as __ from '@mephisto5558/better-types'; /* eslint-disable-line import-x/no-namespace -- load in global definitions */
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { Command } from './classes/command';
import type { CommandOption, CommandOptionConfig, StrictCommandOption, TypeSafeOptionResolver } from './classes/commandOption';

export * from './utils/index.js';
export * from './classes/command';
export * from './classes/commandOption';
export * from './classes/commandManager';
export {
  PermissionFlagsBits as Permissions,
  ApplicationCommandOptionType as OptionType
} from 'discord.js';

// for better-ms
export declare function getMilliseconds<
  T extends validTimeString | number
>(val: T, options: { long: boolean }): (T extends string ? number : string) | undefined;

type BuildOrderedCooldown<T extends readonly string[]> = T extends [infer Head extends string, ...infer Tail extends string[]]
  ? `${number}${Head}` | `${number}${Head}${BuildOrderedCooldown<Tail>}` | BuildOrderedCooldown<Tail>
  : never;

/**
 * This is more limited than what's actually allowed to enforce consitency.
 *
 * day, hour, minute, second, millisecond */
type TimeUnits = ['d', 'h', 'min', 's', 'ms'];
export type validTimeString = BuildOrderedCooldown<TimeUnits>;

export type CommandType = 'slash' | 'prefix';
export declare const commandTypes: { readonly [K in CommandType]: K };

export type OptionsG<CT, DM> = readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[];
export type DefaultOptionType<CT extends readonly CommandType[], DM extends boolean>
  = CommandOptionConfig<CT, DM, never, readonly unknown[]> | CommandOption<CT, DM, never, readonly unknown[]>;

export type CooldownTypes = 'guild' | 'channel' | 'user';
type Cooldowns = { [K in CooldownTypes]: validTimeString } & {};

export interface SharedConfig<DM extends boolean> {
  cooldowns?: Partial<Cooldowns>;

  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;
}

export interface ChatInputCommandInteraction<
  Cached extends CacheType = CacheType, Options extends readonly unknown[] = []
> extends _ChatInputCommandInteraction<Cached> {
  options: TypeSafeOptionResolver<Cached, Options>;
}

export type ResolveContext<MAP, KEYS extends readonly (keyof MAP)[]> = {
  [K in KEYS[number]]: MAP[K]
}[KEYS[number]];

export type commandDoneFn<cmd extends Command = Command<CommandType[], boolean>> = (
  this: ThisParameterType<cmd['run']>,
  command: cmd, lang: Translator
) => Promise<never>;

/**
 * @returns If a permsision error was found: Parameters for `Translator`
 * @returns If a permission error was handled by the function: `true`
 * @returns If no permission error was found: `false`
 */
export type customPermissionChecksFn<
  cmd extends Command = Command<CommandType[], boolean>,
  RetMsgs extends Parameters<Translator> = Parameters<Translator>
> = ((
  this: cmd, interaction: ThisParameterType<cmd['run']>,
  author: User, translator: Translator<false, Locale>
) => Promise<RetMsgs | boolean>)
| ((
  this: cmd, interaction: ThisParameterType<cmd['run']>,
  author: User, translator: Translator<false, Locale>
) => RetMsgs | boolean);


export declare class CommandExecutionError extends Error {
  name: 'CommandExecutionError';

  interaction: ThisParameterType<Command<CommandType[], boolean>['run']>;
  translator: Translator<boolean, Locale>;

  constructor(
    message: CommandExecutionError['message'], interaction: CommandExecutionError['interaction'],
    translator: CommandExecutionError['translator'], options?: ErrorOptions
  );
}