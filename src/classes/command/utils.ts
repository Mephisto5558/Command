/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  ChatInputCommandInteraction as _ChatInputCommandInteraction, Message as _Message, PermissionFlags, _NonNullableFields
} from 'discord.js';
import type { AllContexts, Command, CommandOption, OptionsG, PermissionType, SharedConfig } from '../../index.ts';
import type { PrimitiveCommandOptionConfig, RunnableReturns as OptionRunnableReturns } from '../commandOption/utils.ts';
import type { CommandType } from '../utils.ts';


export type RunnableReturns = ['nonBeta']
  | ['disabled', string]
  | ['slashOnly', ReturnType<Command['mention']>]
  | ['guildOnly']
  | ['nsfw']
  | ['cooldown', string]
  | OptionRunnableReturns;

type Space<T extends string | undefined> = T extends string ? ` ${T}` : '';

export type CommandMention<
  Group extends string | undefined,
  Subcommand extends string | undefined,
  CT extends readonly CommandType[] = CommandType[],
  Name extends Command['name'] = Command['name'],
  Id extends NonNullable<Command<NoInfer<CT>>['commandId']> | bigint = NonNullable<Command<NoInfer<CT>>['commandId']> | bigint
> = `</${Name}${Space<Group>}${Space<Subcommand>}:${Id}>`;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- interface is correct here */
export interface CommandConfig<
  CT extends readonly CommandType[], CTX extends AllContexts,
  Options extends OptionsG<CT, CTX> = readonly PrimitiveCommandOptionConfig<CT, CTX>[]
> extends SharedConfig<CTX> {
  types: CT;
  usage?: { usage?: string; examples?: string }; // TODO: support arrays
  aliases?: { [K in NoInfer<CT>[number]]?: Lowercase<string>[] };
  permissions?: Partial<Record<PermissionType, PermissionFlags[keyof PermissionFlags][]>>;

  options?: Options;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  beta?: true;

  run: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['run'];
}

export type DeepOptions<T> = T extends { options: readonly (infer U)[] } ? T | DeepOptions<U> : T;
export type ResolvedOption<CT extends readonly CommandType[], CTX extends AllContexts, E>
  = StrictOmit<CommandOption<NoInfer<CT>, NoInfer<CTX>>, keyof E & keyof CommandOption> & E;