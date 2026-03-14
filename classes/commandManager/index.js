/**
 * @import { ApplicationCommand } from 'discord.js'
 * @import { CommandType } from '../..'
 * @import { ManagerConfig, CommandManager as CommandManagerT } from '.' */

const
  { Collection } = require('discord.js'),
  { readdir } = require('node:fs/promises'),
  { basename, dirname, join, resolve } = require('node:path'),
  { commandTypes } = require('../..'),
  { capitalize, filename, getDirectories, loadFile } = require('../../utils'),
  { Command } = require('../command');

module.exports = class CommandManager {
  /** @type {CommandManagerT['commands']} */ commands = new Collection();

  /** @type {Collection<string, string>} */ #filePaths = new Collection();
  /** @type {NonNullable<NonNullable<ManagerConfig[3]>['logger']>} */ #logger = console;
  /** @type {NonNullable<NonNullable<ManagerConfig[3]>['devIds']>} */ #devIds = new Set();
  /** @type {NonNullable<NonNullable<ManagerConfig[3]>['devOnlyCategories']>} */ #devOnlyCategories = new Set();
  /** @type {NonNullable<NonNullable<ManagerConfig[3]>['runBetaCommandsOnly']>} */ #runBetaCommandsOnly = false;
  /** @type {NonNullable<NonNullable<ManagerConfig[3]>['replyOn']>} */ #replyOn = { disabled: false, nonBeta: false };
  /** @type {NonNullable<ManagerConfig[3]>['customPermissionChecks']} */ #customPermissionChecks;

  /** @type {(...config: ManagerConfig) => CommandManagerT} */
  constructor(commandsPath, client, i18n, {
    logger, doneFn, cooldownsManager,
    devIds, devOnlyCategories, runBetaCommandsOnly, replyOn, customPermissionChecks
  } = {}) {
    this.commandsPath = commandsPath;
    this.client = client;
    this.i18n = i18n;
    if (logger) this.#logger = logger;
    this.doneFn = doneFn;
    this.cooldownsManager = cooldownsManager;
    if (devIds) this.#devIds = devIds;
    if (devOnlyCategories) this.#devOnlyCategories = devOnlyCategories;
    if (runBetaCommandsOnly) this.#runBetaCommandsOnly = runBetaCommandsOnly;
    if (replyOn) this.#replyOn = replyOn;
    this.#customPermissionChecks = customPermissionChecks;
  }

  /** @type {CommandManagerT['get']} */
  get(query) {
    return this.commands.get(query.toLowerCase()) ?? this.commands.find(e => e.aliases.slash.includes(query) || e.aliases.prefix.includes(query));
  }

  async loadAll() {
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

  async reloadAll() {
    return this.loadAll();
  }

  /** @type {CommandManagerT['reload']} */
  async reload(query) {
    const command = this.get(query);
    if (!command) throw new Error(`Command "${query}" not found.`);

    return this.#loadCommand(this.#filePaths.get(command.name), command);
  }

  /**
   * @param {string} filePath
   * @param {Command} oldCommand */
  async #loadCommand(filePath, oldCommand) {
    /** @type {Command | { default: Command }} */
    let commandFile = await loadFile(filePath);
    commandFile = typeof commandFile == 'object' && 'default' in commandFile ? commandFile.default : commandFile;

    if (!(commandFile instanceof Command)) return;

    const
      name = filename(filePath),
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

  /** @type {CommandManagerT['registerCommand']} */
  async registerCommand(newCommand, oldCommand) {
    if (!newCommand.types.includes(commandTypes.slash)) return;

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

  /**
   * @param {Command<CommandType[], boolean>} newCommand
   * @param {Command<CommandType[], boolean> | undefined} oldCommand
   * @param {string} alias
   * @param {boolean} isEqual
   * @param {Collection<string, ApplicationCommand>} existingCommands */
  async #registerAlias(newCommand, oldCommand, alias, isEqual, existingCommands) {
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

  /**
   * @param {string} action
   * @param {string} name
   * @param {string | undefined} alias */
  #logLoadMsg(action, name, alias = name) {
    this.#logger.log(`${action} ${capitalize(commandTypes.slash)} Command ${name}${alias == name ? '' : ' (Alias of ' + alias + ')'}`);
  }
};