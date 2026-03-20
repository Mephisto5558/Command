const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');

module.exports = {
  OptionType: ApplicationCommandOptionType,
  Permissions: PermissionFlagsBits,
  CommandExecutionError: require('./classes/utils').CommandExecutionError,
  commandTypes: require('./classes/utils').commandTypes,
  ...require('./classes/command'),
  ...require('./classes/commandOption'),
  ...require('./classes/commandManager'),
  ...require('./utils')
};