/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import { Collection } from 'discord.js';
import { readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { getDirectories, getFilename, loadFile } from '../../index.ts';
import capitalize from '../../utils/capitalize.ts';
import { Command } from '../command/index.ts';
import { CommandType } from '../utils.ts';

import type { ApplicationCommand, ApplicationCommandDataResolvable, Client } from 'discord.js';
import type { I18nProvider } from '@mephisto5558/i18n';
import type { Logger, commandDoneFn, customPermissionChecksFn } from '../../index.ts';
import type CooldownsManager from '../../utils/CooldownsManager.ts';

type CollectionMember = Command<readonly CommandType[], boolean>;

/* eslint-disable-next-line import-x/prefer-default-export */
export class CommandManager {
  commands = new Collection<CollectionMember['name'], CollectionMember>();
  client!: Client<true>;
  commandsPath!: string;
  doneFn: commandDoneFn | undefined;
  cooldownsManager!: CooldownsManager;
  i18n!: I18nProvider;

  readonly #filePaths = new Collection<CollectionMember['name'], string>();
  #logger: Logger = console;
  #devIds = new Set<Snowflake>();
  #devOnlyCategories = new Set<string>();
  #runBetaCommandsOnly = false;
  #replyOn: { disabled: boolean; nonBeta: boolean } = { disabled: false, nonBeta: false };
  #customPermissionChecks: customPermissionChecksFn | undefined;

  init(
    commandsPath: string,
    client: Client<true>,
    i18n: I18nProvider,
    config: {
      logger?: Logger;
      doneFn?: commandDoneFn;
      cooldownsManager?: CooldownsManager;
      devIds?: Set<Snowflake>;
      devOnlyCategories?: Set<string>;
      runBetaCommandsOnly?: boolean;
      replyOn?: { disabled?: boolean; nonBeta?: boolean };
      customPermissionChecks?: customPermissionChecksFn;
    } = {}
  ): this {
    this.commandsPath = commandsPath;
    this.client = client;
    this.i18n = i18n;
    if (config.logger) this.#logger = config.logger;
    this.doneFn = config.doneFn;
    if (config.cooldownsManager) this.cooldownsManager = config.cooldownsManager;
    if (config.devIds) this.#devIds = config.devIds;
    if (config.devOnlyCategories) this.#devOnlyCategories = config.devOnlyCategories;
    if (config.runBetaCommandsOnly) this.#runBetaCommandsOnly = config.runBetaCommandsOnly;
    if (config.replyOn) this.#replyOn = { disabled: !!config.replyOn.disabled, nonBeta: !!config.replyOn.nonBeta };
    this.#customPermissionChecks = config.customPermissionChecks;

    return this;
  }

  /** Get a command by name or alias. */
  get(query: Lowercase<string>): CollectionMember | undefined {
    return this.commands.get(query.toLowerCase())
      ?? this.commands.find(e => e.aliases[CommandType.Slash].includes(query) || e.aliases[CommandType.Prefix].includes(query));
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
    const command = query instanceof Command ? query : this.get(query.toLowerCase());

    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    return (command ? this.#loadCommand(this.#filePaths.get(command.name)!, command) : undefined) as (
      Promise<CMD extends CollectionMember ? CMD : CollectionMember | undefined>
    );
  }

  /* eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- needed here for some reason */
  async #loadCommand(filePath: string, oldCommand?: CollectionMember): Promise<CollectionMember | void> {
    if (!this.client.application) throw new Error('Client#application must exist (Client must be logged in!)');

    let commandFileImport = await loadFile(filePath);
    commandFileImport = commandFileImport && typeof commandFileImport == 'object' && 'default' in commandFileImport
      ? commandFileImport.default
      : commandFileImport;

    if (!(commandFileImport instanceof Command)) return;

    const
      commandFile = commandFileImport as CollectionMember,
      name = getFilename(filePath) as Lowercase<string>,
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
      if (appCommand) commandFile.commandId = appCommand.id;
    }
    catch (err) {
      return this.#logger.error(`Error on registering command file ${filePath}:\n`, err);
    }

    this.commands.set(commandFile.name, commandFile);
    this.#filePaths.set(commandFile.name, filePath);
    return commandFile;
  }

  async registerCommand(newCommand: CollectionMember, oldCommand?: CollectionMember): Promise<ApplicationCommand | undefined> {
    if (!newCommand.types.includes(CommandType.Slash) || !this.client.application) return;

    const
      { application } = this.client,
      existingCommands = await application.commands.fetch(),
      isEqual = !!oldCommand?.isEqualTo(newCommand);

    let appCommand;

    if (oldCommand?.types.includes(CommandType.Slash) && !newCommand.types.includes(CommandType.Slash)) {
      /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
      if (oldCommand.commandId) await application.commands.delete(oldCommand.commandId);
      this.#logLoadMsg('Deleted', newCommand.name);
    }
    else if (newCommand.types.includes(CommandType.Slash)) {
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
          appCommand = await application.commands.edit(existing.id, newCommand as unknown as ApplicationCommandDataResolvable);
          this.#logLoadMsg('Reloaded', newCommand.name);
        }
        else {
          appCommand = await application.commands.create(newCommand as unknown as ApplicationCommandDataResolvable);
          this.#logLoadMsg('Created', newCommand.name);
        }
      }
    }

    for (const alias of new Set([...oldCommand?.aliases[CommandType.Slash] ?? [], ...newCommand.aliases[CommandType.Slash]]))
      await this.#registerAlias(newCommand, oldCommand, alias, isEqual, existingCommands);

    return appCommand;
  }

  async #registerAlias(
    newCommand: Command<readonly CommandType[], boolean>, oldCommand: Command<readonly CommandType[], boolean> | undefined,
    alias: Lowercase<string>, isEqual: boolean, existingCommands: Collection<string, ApplicationCommand>
  ): Promise<void> {
    if (!this.client.application) throw new Error('Client#application must exist (Client must be logged in!)');

    const
      { application } = this.client,
      inOld = oldCommand?.aliases[CommandType.Slash].includes(alias),
      inNew = newCommand.aliases[CommandType.Slash].includes(alias),
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


      const commandClone = Object.assign(Object.create(Object.getPrototypeOf(newCommand) as CollectionMember), newCommand);
      commandClone.name = alias;

      if (existing) {
        await application.commands.edit(existing.id, commandClone as unknown as ApplicationCommandDataResolvable);
        this.#logLoadMsg('Reloaded', newCommand.name, alias);
      }
      else {
        await application.commands.create(commandClone as unknown as ApplicationCommandDataResolvable);
        this.#logLoadMsg('Created', newCommand.name, alias);
      }
    }
  }

  #logLoadMsg(action: string, name: string, alias: string | undefined = name): void {
    this.#logger.log(`${action} ${capitalize(CommandType.Slash)} Command ${alias}${alias == name ? '' : ' (Alias of ' + name + ')'}`);
  }
}