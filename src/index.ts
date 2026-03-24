/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type { CacheType, ChatInputCommandInteraction as _ChatInputCommandInteraction, User, _NonNullableFields } from 'discord.js';
import type * as __ from '@mephisto5558/better-types'; /* eslint-disable-line import-x/no-namespace -- load in global definitions */
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { Command } from './classes/command/index.ts';
import type { CommandOption } from './classes/commandOption/index.ts';
import type { CommandOptionConfig, StrictCommandOption, TypeSafeOptionResolver } from './classes/commandOption/utils.ts';
import type { CommandType } from './classes/utils.ts';

export * from './utils/index.ts';
export * as Command from './classes/command/index.ts';
export * as CommandOption from './classes/commandOption/index.ts';
export * as CommandManager from './classes/commandManager/index.ts';
export { CommandExecutionError, CommandType } from './classes/utils.ts';
export {
  PermissionFlagsBits as Permissions,
  ApplicationCommandOptionType as OptionType
} from 'discord.js';

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

export type OptionsG<CT extends readonly CommandType[], DM extends boolean> = readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[];
export type DefaultOptionType<CT extends readonly CommandType[], DM extends boolean>
  = CommandOptionConfig<CT, DM, never, OptionsG<CT, DM>> | CommandOption<CT, DM, never, OptionsG<CT, DM>>;

export type CooldownTypes = 'guild' | 'channel' | 'user';
type Cooldowns = { [K in CooldownTypes]: validTimeString } & {};

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extending from it */
export interface SharedConfig<DM extends boolean> {
  cooldowns?: Partial<Cooldowns>;

  dmPermission?: DM;

  disabled?: boolean;
  disabledReason?: string;
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
export interface ChatInputCommandInteraction<
  Cached extends CacheType = CacheType, Options extends readonly unknown[] = []
> extends StrictOmit<_ChatInputCommandInteraction<Cached>, 'options'> {
  options: TypeSafeOptionResolver<Cached, Options>;
}

export type ResolveContext<MAP, KEYS extends readonly (keyof MAP)[]> = {
  [K in KEYS[number]]: MAP[K]
}[KEYS[number]];

export type commandDoneFn<cmd extends Command<CommandType[], boolean> = Command<CommandType[], boolean>> = (
  this: ThisParameterType<cmd['run']>,
  command: cmd, lang: Translator<false, Locale>
) => Promise<never>;

/**
 * @returns If a permsision error was found: Parameters for `Translator`
 * @returns If a permission error was handled by the function: `true`
 * @returns If no permission error was found: `false` */
export type customPermissionChecksFn<
  cmd extends Command<CommandType[], boolean> = Command<CommandType[], boolean>,
  RetMsgs extends Parameters<Translator> = Parameters<Translator>
> = ((
  this: cmd, interaction: ThisParameterType<cmd['run']>,
  author: User, translator: Translator<false, Locale>
) => Promise<RetMsgs | boolean>)
| ((
  this: cmd, interaction: ThisParameterType<cmd['run']>,
  author: User, translator: Translator<false, Locale>
) => RetMsgs | boolean);