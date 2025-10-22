/**
 * @import { updateApplicationCommands as updateApplicationCommandsT } from '.'
 * @import { logWrapper as logWrapperT } from '.'
 * @import { slashCommandsEqual as slashCommandsEqualT } from '.'
 * @import { mapsEqual as mapsEqualT } from '.' */

const Command = require('./commands.js');

module.exports = { ...Command, slashCommandsEqual, updateApplicationCommands };

/** @type {mapsEqualT} */
function mapsEqual(a, b) {
  if ((a?.size ?? 0) !== (b?.size ?? 0)) return false;
  for (const [k, v] of a) if (!b.has(k) || b.get(k) != v) return false;

  return true;
}

/** @type {slashCommandsEqualT} */
function slashCommandsEqual(a, b) {
  if (a === b) return true;
  if ((a instanceof Command.MixedCommand || b instanceof Command.MixedCommand) || a.constructor != b.constructor) return false;

  if (
    a.name != b.name || a.description != b.description || a.type != b.type || a.autocomplete != b.autocomplete
    || a.defaultMemberPermissions?.bitfield != b.defaultMemberPermissions?.bitfield
  ) return false;
  if ((a.options?.length ?? 0) != (b.options?.length ?? 0) || (a.context?.length ?? 0) != (b.context?.length ?? 0)) return false;
  if (!mapsEqual(a.nameLocalizations, b.nameLocalizations)) return false;

  /** The 2nd `instanceof` check is just a typeguard (see 2nd line is this function) */
  if (a instanceof Command.CommandOption && b instanceof Command.CommandOption) {
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- `required` can be undefined at this stage */
    if (!!a.required != !!b.required || a.choices.length != b.choices.length) return false;
    if (a.minValue != b.minValue || a.maxValue != b.maxValue || a.minLength != b.minLength || a.maxLength != b.maxLength) return false;
    if ((a.channelTypes?.length ?? 0) != (b.channelTypes?.length ?? 0)) return false;

    for (const { name, nameLocalizations, value } of a.choices) {
      const choiceB = b.choices.find(e => e.name == name);
      if (choiceB?.value != value || !mapsEqual(choiceB.nameLocalizations, nameLocalizations)) return false;
    }

    if (a.channelTypes) for (const channelType of a.channelTypes) if (!b.channelTypes.includes(channelType)) return false;
  }

  return true;
}

/** @type {logWrapperT} */
function logWrapper(options, type, msg) {
  if (!options[`hide${type}CommandLog`]) this.log(msg);
}

/** @type {updateApplicationCommandsT} */
async function updateApplicationCommands(app, commands, loggerOptions, logger = console) {
  const

    /** @type {typeof console['log']} */
    log = logWrapper.bind(logger, loggerOptions),
    applicationCommands = app.commands.fetch({ withLocalizations: true }),

    /** @type {Parameters<updateApplicationCommands>['1']} */
    handledCommands = new Map();

  for (const command of commands.values()) {
    if (!command.disabled && !command.skip) {
      for (const [,applicationCommand] of await applicationCommands) {
        if (!slashCommandsEqual(command, applicationCommand)) continue;

        logger.log(`Skipped Slash Command ${command.name}`);

        command.skip = true;
        command.id = applicationCommand.id;
        break;
      }
    }

    handledCommands.set(command.name, command);
    for (const alias of command.aliases.slash ?? [])
      handledCommands.set(alias, { ...command, name: alias, aliasOf: command.name });
  }

  let registeredCommandCount = 0;
  for (const command of commands.values()) {
    if (command.skip) continue;
    if (command.disabled) {
      log('Disabled', `Skipped Disabled Slash Command ${command.name}`);
      continue;
    }
    if (app.client.botType == 'dev' && !command.beta) {
      log('NonBeta', `Skipped Non-Beta Slash Command ${command.name}`);
      continue;
    }

    command.id = (await app.client.application.commands.create(command)).id;

    logger.log(`Registered Slash Command ${command.name}` + (command.aliasOf ? ` (Alias of ${command.aliasOf})` : ''));
    registeredCommandCount++;
  }
  logger
    .log(`Registered ${registeredCommandCount} Slash Commands`)
    .log(`Skipped ${app.client.slashCommands.filter(e => e.skip && delete e.skip).size} Slash Commands`);

  let deletedCommandCount = 0;
  for (const applicationCommand of await applicationCommands) {
    const cmd = commands.get(applicationCommand.aliasOf ?? applicationCommand.name);
    if (cmd && !cmd.disabled && (app.client.botType != 'dev' || cmd.beta)) continue;

    try {
      await app.client.application.commands.delete(applicationCommand);

      logger.log(`Deleted Slash Command ${applicationCommand.name}`);
      deletedCommandCount++;
    }
    catch (err) {
      if (app.client.botType == 'dev') throw err;
      logger.error(`Error on deleting command ${applicationCommand.name}:\n`, err);
    }
  }
  logger.log(`Deleted ${deletedCommandCount} Slash Commands`);

  return handledCommands;
}