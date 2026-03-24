/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type { ChatInputCommandInteraction as _ChatInputCommandInteraction, PermissionFlags, _NonNullableFields } from 'discord.js';
import type { Command, CommandType, DefaultOptionType, OptionsG, SharedConfig } from '../../index.ts';
import type {
  CommandOptionConfig, RunnableReturns as OptionRunnableReturns, StrictCommandOption, ValidateOptionsArray
} from '../commandOption/utils.ts';


export type StrictCommand<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> = Command.Command<NoInfer<CT>, NoInfer<DM>, NoInfer<Options>>;

export type RunnableReturns = ['nonBeta']
  | ['disabled', string]
  | ['slashOnly', Command.Command['mention']]
  | ['guildOnly']
  | ['nsfw']
  | ['cooldown', string]
  | OptionRunnableReturns;

export interface CommandConfig<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends OptionsG<CT, DM> = readonly DefaultOptionType<CT, DM>[]
> extends SharedConfig<DM> {
  types: CT;
  usage?: { usage?: string; examples?: string } & {};
  aliases?: { [K in NoInfer<CT>[number]]?: string[] } & {};
  permissions?: { client?: PermissionFlags[keyof PermissionFlags][]; user?: PermissionFlags[keyof PermissionFlags][] } & {};

  options?: ValidateOptionsArray<Options, CT, DM>;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  beta?: true;

  run: StrictCommand<CT, DM, Options>['run'];
}