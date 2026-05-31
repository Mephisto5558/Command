/* eslint-disable-next-line import-x/no-unassigned-import, import-x/no-empty-named-blocks, unicorn/require-module-specifiers, import-x/order
  -- load global types */
import type {} from '@mephisto5558/better-types';

import {
  AutocompleteInteraction as _AutocompleteInteraction,
  InteractionContextType, MessageComponentInteraction as _MessageComponentInteraction, _NonNullableFields
} from 'discord.js';

import type {
  APIInteractionGuildMember, ChatInputCommandInteraction as _ChatInputCommandInteraction,
  Message as _Message, PartialDMChannel, PartialGroupDMChannel, User
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
  ApplicationCommandOptionType as OptionType,
  InteractionContextType as ContextType
} from 'discord.js';

export enum PermissionType {
  Client = 0,
  Role = 1,
  User = 2,
  Channel = 3
}

export const AllContexts = [InteractionContextType.Guild, InteractionContextType.BotDM] as const;
/* eslint-disable-next-line @typescript-eslint/no-redeclare -- type vs const */
export type AllContexts = readonly typeof AllContexts[number][];

type HasGuild<CTX extends AllContexts> = Extends<InteractionContextType.Guild, CTX[number]>;
type HasDM<CTX extends AllContexts>
  = Not<ExtendsNever<CTX[number] & (InteractionContextType.BotDM | InteractionContextType.PrivateChannel)>>;

export type ContextToInGuild<CTX extends AllContexts>
  = If<HasGuild<CTX>, {
    ifTrue: If<HasDM<CTX>, { ifTrue: boolean; ifFalse: true }>;
    ifFalse: false;
  }>;
export type ContextToCaching<CTX extends AllContexts>
  = If<HasGuild<CTX>, {
    ifTrue: If<HasDM<CTX>, { ifTrue: 'cached' | undefined; ifFalse: 'cached' }>;
    ifFalse: undefined;
  }>;

export declare namespace BetterMS {
  function getMilliseconds<
    T extends validTimeString | number
  >(val: T, options?: { long: boolean }): IfExtends<T, string, { ifTrue: number; ifFalse: string }> | undefined;
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

export type OptionsG<CT extends readonly CommandType[], CTX extends AllContexts, AO = undefined>
  = readonly (CommandOptionConfig<CT, CTX, AO> | CommandOption<CT, CTX, AO>)[];

export enum CooldownType {
  Guild = 'guild',
  Channel = 'channel',
  User = 'user'
}
type Cooldowns = Record<CooldownType, validTimeString>;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extending from it */
export interface SharedConfig<CTX extends AllContexts> {
  cooldowns?: Partial<Cooldowns>;

  contexts?: CTX;

  disabled?: boolean;
  disabledReason?: string;
}

// Excluding APIInteractionGuildMember because it's an edge case and annoying for now.
type Member<
  CTX extends AllContexts,
  T extends _Message | _ChatInputCommandInteraction
> = If<HasGuild<CTX>, {
  ifTrue: If<HasDM<CTX>, {
    ifTrue: NonNullable<Exclude<T['member'], APIInteractionGuildMember>> | null;
    ifFalse: NonNullable<Exclude<T['member'], APIInteractionGuildMember>>;
  }>;
  ifFalse: null;
}>;

// Channel may be null or partial in reality, but with the right Partials and Intents it won't.
type InteractionChannel<
  CTX extends AllContexts,
  T1 extends _Message | _ChatInputCommandInteraction,
  T2 extends _Message | _ChatInputCommandInteraction
> = Exclude<
  NonNullable<If<HasGuild<CTX>, {
    ifTrue: If<HasDM<CTX>, {
      ifTrue: T1['channel'] | T2['channel'];
      ifFalse: T1['channel'];
    }>;
    ifFalse: T2['channel'];
  }>>,
  PartialDMChannel | PartialGroupDMChannel
>;


/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-unnecessary-type-parameters
  -- Intended for cross-package augmentation by the consumer. */
export declare class ChatInputCommandInteraction<
  CTX extends AllContexts = AllContexts,
  Options extends readonly unknown[] = []
> {
  readonly member: Member<NoInfer<CTX>, _ChatInputCommandInteraction<ContextToCaching<[InteractionContextType.Guild]>>>;

  readonly channel: InteractionChannel<
    NoInfer<CTX>,
    _ChatInputCommandInteraction<ContextToCaching<[InteractionContextType.Guild]>>,
    _ChatInputCommandInteraction<ContextToCaching<[InteractionContextType.BotDM]>>>;

  readonly options: TypeSafeOptionResolver<ContextToCaching<NoInfer<CTX>>, Options>;
}
export declare class Message<CTX extends AllContexts = AllContexts> {
  readonly member: Member<NoInfer<CTX>, _Message>;
  readonly channel: InteractionChannel<
    NoInfer<CTX>, _Message<ContextToInGuild<[InteractionContextType.Guild]>>,
    _Message<ContextToInGuild<[InteractionContextType.BotDM]>>
  >;
}

export declare class AutocompleteInteraction<CTX extends AllContexts = AllContexts> {}
export declare class MessageComponentInteraction<CTX extends AllContexts = AllContexts> {}

/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-extraneous-class, @typescript-eslint/no-unnecessary-type-parameters */

export type commandDoneFn<CMD extends Command<readonly CommandType[], AllContexts> = Command<readonly CommandType[], AllContexts>> = (
  this: ThisParameterType<CMD['run']>,
  command: CMD, lang: Translator<false, Locale>
) => Promise<never>;


type customPermissionCheckFnParams<CT extends readonly CommandType[], CTX extends AllContexts> = [
  interaction: ThisParameterType<Command<NoInfer<CT>, NoInfer<CTX>>['run']>,
  author: User, translator: Translator<false, Locale>
];

/**
 * @returns If a permsision error was found: Parameters for `Translator`
 * @returns If a permission error was handled by the function: `true`
 * @returns If no permission error was found: `false` */
export type customPermissionChecksFn<
  CT extends readonly CommandType[] = readonly CommandType[], CTX extends AllContexts = AllContexts,
  RetMsgs extends Parameters<Translator> = Parameters<Translator>

  // Split because TS otherwise ignores non-promise return
> = ((this: Command<NoInfer<CT>, NoInfer<CTX>>, ...args: customPermissionCheckFnParams<NoInfer<CT>, NoInfer<CTX>>) => RetMsgs | boolean)
  | ((this: Command<NoInfer<CT>, NoInfer<CTX>>, ...args: customPermissionCheckFnParams<NoInfer<CT>, NoInfer<CTX>>) => Promise<RetMsgs | boolean>);