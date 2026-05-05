/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  ChatInputCommandInteraction as _ChatInputCommandInteraction, Client, Message as _Message, PermissionFlags, _NonNullableFields
} from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type {
  ChatInputCommandInteraction, Command, DMPermType, DefaultOptionType, Message, MessageComponentInteraction,
  OptionsG, PermissionType, ResolveContext, SharedConfig
} from '../../index.ts';
import type { RunnableReturns as OptionRunnableReturns, ValidateOptionsArray } from '../commandOption/utils.ts';
import type { CommandType } from '../utils.ts';


export type StrictCommand<
  CT extends readonly CommandType[], DM extends DMPermType, AO = undefined,
  Options extends OptionsG<CT, DM, AO> = OptionsG<CT, DM, AO>
> = Command<NoInfer<CT>, NoInfer<DM>, Options extends OptionsG<NoInfer<CT>, NoInfer<DM>> ? Options : OptionsG<NoInfer<CT>, NoInfer<DM>>>;

export type RunnableReturns = ['nonBeta']
  | ['disabled', string]
  | ['slashOnly', ReturnType<Command['mention']>]
  | ['guildOnly']
  | ['nsfw']
  | ['cooldown', string]
  | OptionRunnableReturns;

export type CommandMention<
  Group extends string | undefined,
  Subcommand extends string | undefined,
  CT extends readonly CommandType[] = CommandType[],
  Name extends Command['name'] = Command['name'],
  Id extends NonNullable<Command<CT>['commandId']> | bigint = NonNullable<Command<CT>['commandId']> | bigint
> = Group extends undefined
  ? Subcommand extends undefined
    ? `</${Name}:${Id}>`
    : `</${Name} ${Subcommand}:${Id}>`
  : Subcommand extends undefined
    ? `</${Name} ${Group}:${Id}>`
    : `</${Name} ${Group} ${Subcommand}:${Id}>`;

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

  run(
    this: ResolveContext<{
      [CommandType.Slash]: ChatInputCommandInteraction<DM, Options>;
      [CommandType.Component]: MessageComponentInteraction<DM>;
      [CommandType.Prefix]: Message<DM>;
    }, CT>,
    lang: Translator<false, Locale>,
    client: Client<true>, commandConfig: this
  ): unknown;
}