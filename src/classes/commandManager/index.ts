import { Collection } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { commandTypes } from '../../index.ts';
import capitalize from '../../utils/capitalize.ts';
import { Command } from '../command/index.ts';

import type { ApplicationCommand, Client, Snowflake } from 'discord.js';
import type { I18nProvider } from '@mephisto5558/i18n';
import type { CommandType, Logger, commandDoneFn, customPermissionChecksFn } from '../../index.ts';
import type CooldownsManager from '../../utils/CooldownsManager.ts';

type CollectionMember = Command<CommandType[], boolean>;

/* eslint-disable-next-line import-x/prefer-default-export */
export class CommandManager {
  commands = new Collection<string, CollectionMember>();
  client: Client;
  commandsPath: string;
  doneFn: commandDoneFn | undefined;
  cooldownsManager: CooldownsManager;
  i18n: I18nProvider;

  readonly #filePaths = new Collection<string, string>();
  #logger: Logger = console;
  #devIds = new Set<Snowflake>();
  #devOnlyCategories = new Set<string>();
  #runBetaCommandsOnly = false;
  #replyOn: { disabled: boolean; nonBeta: boolean } = { disabled: false, nonBeta: false };
  #customPermissionChecks: customPermissionChecksFn | undefined;

  init(
    commandsPath: this['commandsPath'],
    client: this['client'],
    i18n: this['i18n'],
    config: {
      logger?: Logger;
      doneFn?: commandDoneFn;
      cooldownsManager?: CooldownsManager;
      devIds?: Set<Snowflake>;
      devOnlyCategories?: Set<string>;
      runBetaCommandsOnly?: boolean;
      replyOn?: { disabled: boolean; nonBeta: boolean };
      customPermissionChecks?: customPermissionChecksFn;
    } = {}
  ): this {
    this.commandsPath = commandsPath;
    this.client = client;
    this.i18n = i18n;
    if (config.logger) this.#logger = config.logger;
    this.doneFn = config.doneFn;
    this.cooldownsManager = config.cooldownsManager;
    if (config.devIds) this.#devIds = config.devIds;
    if (config.devOnlyCategories) this.#devOnlyCategories = config.devOnlyCategories;
    if (config.runBetaCommandsOnly) this.#runBetaCommandsOnly = config.runBetaCommandsOnly;
    if (config.replyOn) this.#replyOn = config.replyOn;
    this.#customPermissionChecks = config.customPermissionChecks;

    return this;
  }

  /** Get a command by name or alias. */
  get(query: Lowercase<string>): CollectionMember | undefined {
    return this.commands.get(query.toLowerCase()) ?? this.commands.find(e => e.aliases.slash.includes(query) || e.aliases.prefix.includes(query));
  }

  async loadAll(): Promise<CommandManager['commands']> {
    this.commands.clear();
    const dirs = await getDirectories(this.commandsPath);

    for (const subFolder of dirs) {
      for (const file of await readdir(join(this.commandsPath, subFolder), { withFileTypes: true })) {
        if (!file.name.endsWith('.js') && !file.isDirectory()) continue;

        await this.#loadCommand(resolve(file.parentPath, file.name));
      }
    }
    return this.commands;
  }

  async reloadAll(): Promise<CommandManager['commands']> {
    return this.loadAll();
  }

  async reload<
    CMD extends CollectionMember | string
  >(query: CMD): Promise<CMD extends CollectionMember ? CMD : CollectionMember | undefined> {
    const command = query instanceof Command ? query : this.get(query);
    if (!command) return;

    return this.#loadCommand(this.#filePaths.get(command.name), command);
  }

  async #loadCommand(filePath: string, oldCommand: Command): Promise<CollectionMember | undefined> {
    if (!this.client?.application) throw new Error('Client#application must exist (Client must be logged in!)');

    let commandFile: Command | { default: Command } = await loadFile(filePath);
    commandFile = typeof commandFile == 'object' && 'default' in commandFile ? commandFile.default : commandFile;

    if (!(commandFile instanceof Command)) return;

    const
      name = getFilename(filePath),
      category = basename(dirname(filePath));

    try {
      commandFile.init(this.i18n, name, category, {
        logger: this.#logger,
        doneFn: this.doneFn,
        cooldownsManager: this.cooldownsManager,
        devIds: this.#devIds,
        devOnlyCategories: this.#devOnlyCategories,
        runBetaCommandsOnly: this.#runBetaCommandsOnly,
        replyOn: this.#replyOn,
        customPermissionChecks: this.#customPermissionChecks
      });
    }
    catch (err) {
      return this.#logger.error(`Error on initializing command file ${filePath}:\n`, err);
    }

    try {
      // Handle Reload Logic (API Sync)
      const appCommand = await this.registerCommand(commandFile, oldCommand);
      commandFile.commandId = appCommand?.id;
    }
    catch (err) {
      return this.#logger.error(`Error on registering command file ${filePath}:\n`, err);
    }

    this.commands.set(commandFile.name, commandFile);
    this.#filePaths.set(commandFile.name, filePath);
    return commandFile;
  }

  async registerCommand(newCommand: CollectionMember, oldCommand?: CollectionMember): Promise<ApplicationCommand | undefined> {
    if (!newCommand.types.includes(commandTypes.slash) || !this.client?.application) return;

    const
      { application } = this.client,
      existingCommands = await application.commands.fetch(),
      isEqual = oldCommand?.isEqualTo(newCommand);

    let appCommand;

    if (oldCommand?.types.includes(commandTypes.slash) && !newCommand.types.includes(commandTypes.slash)) {
      if (oldCommand.commandId) await application.commands.delete(oldCommand.commandId);
      this.#logLoadMsg('Deleted', newCommand.name);
    }
    else if (newCommand.types.includes(commandTypes.slash)) {
      if (newCommand.disabled) {
        if (oldCommand?.commandId) {
          await application.commands.delete(oldCommand.commandId);
          this.#logLoadMsg('Deleted Disabled', newCommand.name);
        }
      }
      else if (isEqual && oldCommand?.commandId && existingCommands.has(oldCommand.commandId))
        appCommand = existingCommands.get(oldCommand.commandId);
      else {
        const existing = existingCommands.find(e => e.name == newCommand.name);
        if (existing) {
          appCommand = await application.commands.edit(existing.id, newCommand);
          this.#logLoadMsg('Reloaded', newCommand.name);
        }
        else {
          appCommand = await application.commands.create(newCommand);
          this.#logLoadMsg('Created', newCommand.name);
        }
      }
    }

    for (const alias of new Set([...oldCommand?.aliases.slash ?? [], ...newCommand.aliases.slash]))
      await this.#registerAlias(newCommand, oldCommand, alias, isEqual, existingCommands);

    return appCommand;
  }

  async #registerAlias(
    newCommand: Command<CommandType[], boolean>, oldCommand: Command<CommandType[], boolean> | undefined,
    alias: Lowercase<string>, isEqual: boolean, existingCommands: Collection<string, ApplicationCommand>
  ): Promise<void> {
    if (!this.client.application) throw new Error('Client#application must exist (Client must be logged in!)');

    const
      { application } = this.client,
      inOld = oldCommand?.aliases.slash.includes(alias),
      inNew = newCommand.aliases.slash.includes(alias),
      existing = existingCommands.find(e => e.name == alias);

    if (inOld && !inNew) {
      if (existing) {
        await application.commands.delete(existing.id);
        this.#logLoadMsg('Deleted', newCommand.name, alias);
      }
    }
    else if (inNew) {
      if (newCommand.disabled) {
        if (!existing) return;
        await application.commands.delete(existing.id);
        return this.#logLoadMsg('Deleted Disabled', newCommand.name, alias);
      }

      if (isEqual && inOld && existing) return;

      // clone class instance to change it's name
      const commandClone = Object.assign(Object.create(Object.getPrototypeOf(newCommand)), newCommand);
      commandClone.name = alias;

      if (existing) {
        await application.commands.edit(existing.id, commandClone);
        this.#logLoadMsg('Reloaded', newCommand.name, alias);
      }
      else {
        await application.commands.create(commandClone);
        this.#logLoadMsg('Created', newCommand.name, alias);
      }
    }
  }

  #logLoadMsg(action: string, name: string, alias: string | undefined = name) {
    this.#logger.log(`${action} ${capitalize(commandTypes.slash)} Command ${alias}${alias == name ? '' : ' (Alias of ' + name + ')'}`);
  }
}