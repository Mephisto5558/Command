/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  CacheType, ChatInputCommandInteraction as _ChatInputCommandInteraction, Client, Message,
  MessageComponentInteraction, PermissionFlags, _NonNullableFields
} from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { ChatInputCommandInteraction, Command, DefaultOptionType, OptionsG, PermissionType, ResolveContext, SharedConfig } from '../../index.ts';
import type {
  CommandOptionConfig, RunnableReturns as OptionRunnableReturns, StrictCommandOption, ValidateOptionsArray
} from '../commandOption/utils.ts';
import type { CommandType } from '../utils.ts';


export type StrictCommand<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> = Command<NoInfer<CT>, NoInfer<DM>, NoInfer<Options>>;

export type RunnableReturns = ['nonBeta']
  | ['disabled', string]
  | ['slashOnly', Command['mention']]
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
  aliases?: { [K in NoInfer<CT>[number]]?: Lowercase<string>[] };
  permissions?: Partial<Record<PermissionType, PermissionFlags[keyof PermissionFlags][]>>;

  options?: ValidateOptionsArray<Options, CT, DM>;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  beta?: true;

  run(
    this: ResolveContext<{
      [CommandType.Slash]: ChatInputCommandInteraction<DM extends false ? 'cached' : CacheType, NoInfer<Options>>;
      [CommandType.Component]: MessageComponentInteraction<DM extends false ? 'cached' : CacheType>;
      [CommandType.Prefix]: Message<DM extends false ? true : false>;
    }, NoInfer<CT>>,
    lang: Translator<false, Locale>, client: Client<true>
  ): unknown;
}