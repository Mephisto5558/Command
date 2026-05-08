/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  ChatInputCommandInteraction as _ChatInputCommandInteraction, Message as _Message, PermissionFlags, _NonNullableFields
} from 'discord.js';
import type { Command, CommandOption, DMPermType, DefaultOptionType, OptionsG, PermissionType, SharedConfig } from '../../index.ts';
import type { RunnableReturns as OptionRunnableReturns, ValidateOptionsArray } from '../commandOption/utils.ts';
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
  Id extends NonNullable<Command<CT>['commandId']> | bigint = NonNullable<Command<CT>['commandId']> | bigint
> = `</${Name}${Space<Group>}${Space<Subcommand>}:${Id}>`;

export interface CommandConfig<
  CT extends readonly CommandType[], DM extends DMPermType,
  Options extends OptionsG<CT, DM> = DefaultOptionType<CT, DM>[]
> extends SharedConfig<DM> {
  types: CT;
  usage?: { usage?: string; examples?: string }; // TODO: support arrays
  aliases?: { [K in NoInfer<CT>[number]]?: Lowercase<string>[] };
  permissions?: Partial<Record<PermissionType, PermissionFlags[keyof PermissionFlags][]>>;

  options?: ValidateOptionsArray<Options, CT, DM>;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  beta?: true;

  run: Command<CT, DM, Options>['run'];
}

export type DeepOptions<T> = T extends { options: readonly (infer U)[] } ? T | DeepOptions<U> : T;
export type ResolvedOption<CT extends readonly CommandType[], DM extends DMPermType, E>
  = StrictOmit<CommandOption<NoInfer<CT>, NoInfer<DM>>, keyof E & keyof CommandOption> & E;