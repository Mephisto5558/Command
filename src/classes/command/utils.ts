/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type * as Discord from 'discord.js';
import type {
  AllContexts,
  CommandInitialized as Command, CommandOptionInitialized as CommandOption,
  OptionsG, PermissionType, SharedConfig
} from '../../index.ts';
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

export interface CommandConfig<
  CT extends readonly CommandType[], CTX extends AllContexts,
  Options extends OptionsG<CT, CTX> = readonly PrimitiveCommandOptionConfig<CT, CTX>[]
> extends SharedConfig<CTX> {
  types: CT;
  usage?: { usage?: string; examples?: string }; // TODO: support arrays
  aliases?: { [K in NoInfer<CT>[number]]?: Command['name'][] };
  permissions?: Partial<Record<PermissionType, Discord.PermissionFlags[keyof Discord.PermissionFlags][]>>;

  options?: Options;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  beta?: true;

  run: Command<NoInfer<CT>, NoInfer<CTX>, NoInfer<Options>>['run'];
}

export type DeepOptions<T> = T extends { options: readonly (infer U)[] } ? T | DeepOptions<U> : T;
export type ResolvedOption<CT extends readonly CommandType[], CTX extends AllContexts, E>
  = StrictOmit<CommandOption<NoInfer<CT>, NoInfer<CTX>>, keyof E & keyof CommandOption> & E;