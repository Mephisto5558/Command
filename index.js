/**
 * @typedef {import('./commands').SlashCommand<boolean>}SlashCommand
 * @typedef {import('./commands').MixedCommand<boolean>}MixedCommand*/

module.exports = require('./commands');


/**
 * @param {SlashCommand | MixedCommand | import('./commands').CommandOption<SlashCommand | MixedCommand> | undefined}a
 * @param {a}b*/
function slashCommandsEqual(a, b) {
  if (!a.toString() && !b.toString()) return true;
  if (typeof a == 'string' || typeof b == 'string') return a == b;
  if (a == undefined && !(b.__count__ ?? 0) || b == undefined && !(a.__count__ ?? 0)) return true;
  if (
    !!a != !!b || a.name != b.name || a.description != b.description || a.type != b.type || a.autocomplete != b.autocomplete || a.dmPermission != b.dmPermission
    || a.value != b.value || (a.options?.length ?? 0) != (b.options?.length ?? 0) || (a.channelTypes?.length ?? 0) != (b.channelTypes?.length ?? 0)
    || (a.choices?.length ?? 0) != (b.choices?.length ?? 0) || a.minValue != b.minValue || a.maxValue != b.maxValue || a.minLength != b.minLength
    || a.maxLength != b.maxLength || !!a.required != !!b.required || a.defaultMemberPermissions?.bitfield != b.defaultMemberPermissions?.bitfield
    || !slashCommandsEqual(a.nameLocalizations, b.nameLocalizations) || !slashCommandsEqual(a.descriptionLocalizations, b.descriptionLocalizations)
  ) return false;

  if (a.choices?.length) {
    for (let i = 0; i < a.choices?.length; i++) {
      if (
        !slashCommandsEqual(a.choices[i], b.choices.find(e => e.name == a.choices[i].name))
        || !slashCommandsEqual(b.options[i], a.choices.find(e => e.name == b.choices[i].name))
      ) return false;
    }
  }

  if (a.channelTypes) for (const channelType of a.channelTypes) if (!b.channelTypes.includes(channelType)) return false;

  return true;
}

/** @type {import('.')['updateApplicationCommands']}*/
module.exports.updateApplicationCommands = async function updateApplicationCommands(app, commands, logger, loggerOptions) {
  /**
   * @param {string}type
   * @param {string}msg*/
  function log(type, msg) {
    if (!loggerOptions[`hide${type}CommandLog`]) return;
    logger.log(msg);
  }

  const
    applicationCommands = app.commands.fetch({ withLocalizations: true }),

    /** @type {Map<string, SlashCommand>}*/
    handledCommands = new Map();


  // Done so typing works...
  let
    /** @type {SlashCommand & { skip?: true }}*/command,
    /** @type {import('discord.js').ApplicationCommand<{guild: import('discord.js').GuildResolvable}>}*/applicationCommand;

  for (command of commands.values()) {
    if (!command.disabled && !command.skip) {
      for (applicationCommand of await applicationCommands) {
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
  for (command of commands.values()) {
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
  logger.log(`Registered ${registeredCommandCount} Slash Commands`)(`Skipped ${app.client.slashCommands.filter(e => e.skip && delete e.skip).size} Slash Commands`);

  let deletedCommandCount = 0;
  for (applicationCommand of await applicationCommands) {
    const cmd = commands.get(command.aliasOf ?? command.name);
    if (cmd && !cmd.disabled && (app.client.botType != 'dev' || cmd.beta)) continue;

    try {
      await app.client.application.commands.delete(command);

      logger.log(`Deleted Slash Command ${command.name}`);
      deletedCommandCount++;
    }
    catch (err) {
      if (app.client.botType == 'dev') throw err;
      logger.error(`Error on deleting command ${command.name}:\n`, err);
    }
  }
  logger.log(`Deleted ${deletedCommandCount} Slash Commands`);

  return handledCommands;
};