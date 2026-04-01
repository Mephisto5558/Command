/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  ChatInputCommandInteraction as _ChatInputCommandInteraction, Client, Message as _Message, PermissionFlags, _NonNullableFields
} from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type {
  ChatInputCommandInteraction, Command, DefaultOptionType, Message, MessageComponentInteraction,
  OptionsG, PermissionType, ResolveContext, SharedConfig
} from '../../index.ts';
import type { RunnableReturns as OptionRunnableReturns, ValidateOptionsArray } from '../commandOption/utils.ts';
import type { CommandType } from '../utils.ts';


export type StrictCommand<
  CT extends readonly CommandType[], DM extends boolean, AO extends unknown[] = [],
  Options extends OptionsG<CT, DM, AO> = OptionsG<CT, DM, AO>
> = Command<NoInfer<CT>, NoInfer<DM>, Options extends OptionsG<NoInfer<CT>, NoInfer<DM>> ? Options : OptionsG<NoInfer<CT>, NoInfer<DM>>>;

export type RunnableReturns = ['nonBeta']
  | ['disabled', string]
  | ['slashOnly', Command['mention']]
  | ['guildOnly']
  | ['nsfw']
  | ['cooldown', string]
  | OptionRunnableReturns;

export interface CommandConfig<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends OptionsG<CT, DM> = DefaultOptionType<CT, DM>[]
> extends SharedConfig<DM> {
  types: CT;
  usage?: { usage?: string; examples?: string };
  aliases?: { [K in NoInfer<CT>[number]]?: Lowercase<string>[] };
  permissions?: Partial<Record<PermissionType, PermissionFlags[keyof PermissionFlags][]>>;

  options?: ValidateOptionsArray<Options, CT, DM>;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  beta?: true;

  run(
    this: ResolveContext<{
      [CommandType.Slash]: ChatInputCommandInteraction<DM, Options>;
      [CommandType.Component]: MessageComponentInteraction<DM>;
      [CommandType.Prefix]: Message<DM>;
    }, CT>,
    lang: Translator<false, Locale>, client: Client<true>
  ): unknown;
}