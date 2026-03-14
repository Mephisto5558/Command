import type { ApplicationCommand, Client, Collection, Snowflake } from 'discord.js';
import type { I18nProvider } from '@mephisto5558/i18n';
import type { CommandType, CooldownsManager, commandDoneFn, customPermissionChecksFn } from '../..';
import type { Command } from '../command';

export type Logger = {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
  debug: typeof console.debug;
};

export type ManagerConfig = [
  commandsPath: string,
  client: Client,
  i18n: I18nProvider,
  config?: {
    logger?: Logger;
    doneFn?: commandDoneFn;
    cooldownsManager?: CooldownsManager;
    devIds?: Set<Snowflake>;
    devOnlyCategories?: Set<string>;
    runBetaCommandsOnly?: boolean;
    replyOn?: { disabled: boolean; nonBeta: boolean };
    customPermissionChecks?: customPermissionChecksFn;
  }
];

type CollectionMember = Command<CommandType[], boolean>;
export declare class CommandManager {
  commands: Collection<string, CollectionMember>;
  client: Client;
  commandsPath: string;
  doneFn?: commandDoneFn;
  cooldownsManager: CooldownsManager;

  constructor(...config: ManagerConfig);

  /** Get a command by name or alias. */
  get(query: string): CollectionMember | undefined;

  loadAll(): Promise<CommandManager['commands']>;
  reloadAll(): Promise<CommandManager['commands']>;

  reload(query: string): Promise<CollectionMember | undefined>;

  registerCommand(newCommand: CollectionMember, oldCommand?: CollectionMember): Promise<ApplicationCommand | undefined>;
}