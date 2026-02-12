const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');


module.exports = {
  OptionType: ApplicationCommandOptionType,
  Permissions: PermissionFlagsBits,
  loaders: require('./loaders'),
  CommandExecutionError: require('./classes/utils').CommandExecutionError,
  ...require('./classes/command'),
  ...require('./classes/commandOption'),
  ...require('./utils')
};