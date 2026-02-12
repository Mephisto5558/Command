import type { BaseInteraction, Message } from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { CommandType, CooldownTypes } from '..';
import type { Command } from '../classes/command';

export { default as constants } from './constants';

export declare function capitalize<T extends string>(str: T): Capitalize<T>;

/** Formats an application command name and id into a command mention. */
export declare function commandMention<CommandName extends string, CommandId extends Snowflake>(
  name: CommandName, id: CommandId
): `</${CommandName}:${CommandId}>`;

export declare class CooldownsManager {
  cache: Map<string, Map<CooldownTypes, Map<Snowflake, number>>>;

  /** @returns milliseconds until the cooldown ends */
  update(
    name: string, context: BaseInteraction | Message,
    cooldowns: Partial<Command<CommandType[], boolean>['cooldowns']>
  ): number;
}

export declare function filename(path: string): string;

export declare function getCommands(
  this: Client,
  lang: Translator<true, Locale>,
  commands: Command<CommandType[], boolean>[],
  excludeCategories?: Command['category'][]
): {
  category: string;
  subTitle: '';
  aliasesDisabled: boolean;
  list: {
    commandName: string;
    commandUsage: string;
    commandDescription: string;
    commandAlias: string;
  }[];
}[];

export declare function getDirectories(
  path: string
): Promise<string>;

export declare function loadFile(
  path: string
): Promise<unknown>;