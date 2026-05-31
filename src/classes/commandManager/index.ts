import * as Discord from 'discord.js';
import { readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import { getDirectories, getFilename, loadFile } from '../../index.ts';
import capitalize from '../../utils/capitalize.ts';
import { Command } from '../command/index.ts';
import { CommandType } from '../utils.ts';

import type { I18nProvider } from '@mephisto5558/i18n';
import type { AllContexts, Logger, commandDoneFn, customPermissionChecksFn } from '../../index.ts';
import type CooldownsManager from '../../utils/CooldownsManager.ts';
import type { CommandOptionConfig } from '../commandOption/utils.ts';

function importDefault(obj?: unknown): unknown {
  return obj && typeof obj == 'object' && 'default' in obj
    ? obj.default
    : obj;
}

type CollectionMember = Command<
  readonly CommandType[], AllContexts,
  readonly [] | readonly [CommandOptionConfig<readonly CommandType[], AllContexts>, ...CommandOptionConfig<readonly CommandType[], AllContexts>[]]
>;
/* eslint-disable-next-line import-x/prefer-default-export -- simplifies re-export */
export class CommandManager {
  commands = new Discord.Collection<CollectionMember['name'], { command: CollectionMember; filePath: string }>();
  client!: Discord.Client<true>;
  commandsPath!: string;
  doneFn: commandDoneFn | undefined;
  cooldownsManager!: CooldownsManager;
  i18n!: I18nProvider;

  #logger: Logger = console;
  #devIds = new Set<Snowflake>();
  #devOnlyCategories = new Set<CollectionMember['category']>();
  #runBetaCommandsOnly = false;
  #replyOn: { disabled: boolean; nonBeta: boolean } = { disabled: false, nonBeta: false };
  #customPermissionChecks: customPermissionChecksFn | undefined;

  init(
    commandsPath: string,
    client: Discord.Client<true>,
    i18n: I18nProvider,
    config: {
      logger?: Logger;
      doneFn?: commandDoneFn;
      cooldownsManager?: CooldownsManager;
      devIds?: Set<Snowflake>;
      devOnlyCategories?: Set<CollectionMember['category']>;
      runBetaCommandsOnly?: boolean;
      replyOn?: { disabled?: boolean; nonBeta?: boolean };
      customPermissionChecks?: customPermissionChecksFn;
    } = {}
  ): this {
    if (config.logger) this.#logger = config.logger;
    if (config.cooldownsManager) this.cooldownsManager = config.cooldownsManager;
    if (config.devIds) this.#devIds = config.devIds;
    if (config.devOnlyCategories) this.#devOnlyCategories = config.devOnlyCategories;
    if (config.runBetaCommandsOnly) this.#runBetaCommandsOnly = config.runBetaCommandsOnly;
    if (config.replyOn) this.#replyOn = { disabled: !!config.replyOn.disabled, nonBeta: !!config.replyOn.nonBeta };

    this.commandsPath = commandsPath;
    this.client = client;
    this.i18n = i18n;
    this.doneFn = config.doneFn;
    this.#customPermissionChecks = config.customPermissionChecks;

    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- validation */
    if (!this.client.application) throw new Error('Client#application must exist (Client must be logged in!)');

    return this;
  }

  /** Get a command by name or alias. */
  get(query: string): CollectionMember | undefined {
    const commandName = query.toLowerCase();

    return (
      this.commands.get(commandName)
      ?? this.commands.find(({ command }) => Object.values(command.aliases).some(e => e.includes(commandName)))
    )?.command;
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

  async reload<
    CMD extends CollectionMember | string
  >(query: CMD): Promise<CMD extends CollectionMember ? CMD : CollectionMember | undefined> {
    const command = this.commands.get(query instanceof Command ? query.name : query.toLowerCase());
    return (command ? this.#loadCommand(command.filePath, command.command) : undefined) as ReturnType<typeof this.reload<CMD>>;
  }

  static #isCollectionMember(obj: unknown): obj is CollectionMember {
    return obj instanceof Command;
  }

  async #loadCommand(filePath: string, oldCommand?: CollectionMember): Promise<undefined | CollectionMember> {
    const commandFile = importDefault(await loadFile(filePath));
    if (!CommandManager.#isCollectionMember(commandFile)) return;

    try {
      commandFile.init(this.i18n, getFilename(filePath).toLowerCase(), basename(dirname(filePath)), {
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
      this.#logger.error(`Error on initializing command file ${filePath}:\n`, err);
      return;
    }

    try {
      // Handle Reload Logic (API Sync)
      const appCommand = await this.registerCommand(commandFile, oldCommand);
      if (appCommand) commandFile.commandId = appCommand.id;
    }
    catch (err) {
      this.#logger.error(`Error on registering command file ${filePath}:\n`, err);
      return;
    }

    this.commands.set(commandFile.name, { command: commandFile, filePath });
    return commandFile;
  }

  async #createCommand(
    command: Discord.ChatInputApplicationCommandData,
    action: string, alias?: CollectionMember['name']
  ): Promise<Discord.ApplicationCommand> {
    const appCommand = await this.client.application.commands.create(command);
    this.#logLoadMsg(action, appCommand.name, alias);

    return appCommand;
  }

  async #deleteCommand(
    command: Pick<CollectionMember, 'commandId' | 'name'> | Pick<Discord.ApplicationCommand, 'id' | 'name'>,
    action: string, alias?: CollectionMember['name']
  ): Promise<void> {
    await this.client.application.commands.delete('commandId' in command ? command.commandId : command.id);
    this.#logLoadMsg(action, command.name, alias);
  }

  async #editCommand(
    oldCommand: Discord.ApplicationCommand, newCommand: Discord.ApplicationCommandDataResolvable,
    action: string, alias?: CollectionMember['name']
  ): Promise<Discord.ApplicationCommand> {
    const appCommand = await this.client.application.commands.edit(oldCommand.id, newCommand);
    this.#logLoadMsg(action, appCommand.name, alias);

    return appCommand;
  }

  async registerCommand(newCommand: CollectionMember, oldCommand?: CollectionMember): Promise<Discord.ApplicationCommand | undefined> {
    if (!newCommand.types.includes(CommandType.Slash)) return;

    const
      existingCommands = await this.client.application.commands.fetch(),
      isEqual = !!oldCommand?.isEqualTo(newCommand);

    let appCommand;

    if (oldCommand?.types.includes(CommandType.Slash) && !newCommand.types.includes(CommandType.Slash))
      await this.#deleteCommand(oldCommand, 'Deleted');
    else if (newCommand.types.includes(CommandType.Slash)) {
      if (newCommand.disabled) {
        if (oldCommand?.commandId) await this.#deleteCommand(oldCommand, 'Deleted Disabled');
      }
      else if (oldCommand?.commandId && isEqual && existingCommands.has(oldCommand.commandId))
        appCommand = existingCommands.get(oldCommand.commandId);
      else {
        const
          existing = existingCommands.find(e => e.name == newCommand.name),
          commandData = newCommand as unknown as Discord.ChatInputApplicationCommandData;

        appCommand = await (existing ? this.#editCommand(existing, commandData, 'Reloaded') : this.#createCommand(commandData, 'Created'));
      }
    }

    for (const alias of new Set([...oldCommand?.aliases[CommandType.Slash] ?? [], ...newCommand.aliases[CommandType.Slash]]))
      await this.#registerAlias(newCommand, oldCommand, alias, isEqual, existingCommands);

    return appCommand;
  }

  async #registerAlias(
    newCommand: CollectionMember, oldCommand: CollectionMember | undefined,
    alias: CollectionMember['name'], isEqual: boolean, existingCommands: Discord.Collection<string, Discord.ApplicationCommand>
  ): Promise<void> {
    const
      inOld = oldCommand?.aliases[CommandType.Slash].includes(alias),
      inNew = newCommand.aliases[CommandType.Slash].includes(alias),
      existing = existingCommands.find(e => e.name == alias);

    if (inOld && !inNew || inNew && newCommand.disabled) {
      if (existing) await this.#deleteCommand(existing, `Deleted ${newCommand.disabled ? 'Disabled' : ''}`, alias);
    }
    else if (inOld && inNew && isEqual) {
      const commandClone = newCommand.clone() as unknown as Discord.ChatInputApplicationCommandData;
      commandClone.name = alias;

      await (existing ? this.#editCommand(existing, commandClone, 'Reloaded', alias) : this.#createCommand(commandClone, 'Created', alias));
    }
  }

  #logLoadMsg(action: string, name: string, alias: string | undefined = name): void {
    this.#logger.log(`${action} ${capitalize(CommandType.Slash)} Command ${alias}${alias == name ? '' : ' (Alias of ' + name + ')'}`);
  }
}