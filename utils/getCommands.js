/**
 * @import { Command, CommandType } from '..'
 * @import { getCommands as getCommandsT } from '.' */

const { capitalize, commandTypes } = require('..');

/** @typedef {{ commandName: string, commandUsage: string, commandDescription: string, commandAlias: string }[]} commandList */

/** @type {getCommandsT} */
module.exports = function getCommands(lang, commands, excludeCategories) {
  const commandList = commands.reduce((
    /** @type {{ category: string, subTitle: '', aliasesDisabled: boolean, list: commandList }[]} */ acc, cmd
  ) => {
    if (excludeCategories?.includes(cmd.category) || cmd.disabled) return acc;

    let category = acc.find(e => e.category == cmd.category);
    if (!category) {
      category = {
        category: cmd.category,
        subTitle: '',
        list: []
      };
      acc.push(category);
    }

    category.list.push({
      commandName: cmd.name,
      commandUsage: (
        (cmd.types.includes(commandTypes.slash) ? lang('others.getCommands.lookAtOptionDesc') ?? '' : '')
        + (lang(`${cmd.id}.usage.usage`)?.replaceAll(/slash command:/gi, '') ?? '') || lang('others.getCommands.noInfo')
      ).trim().replaceAll('\n', '<br>&nbsp'),
      commandDescription: cmd.descriptionLocalizations[lang.config.locale ?? lang.defaultConfig.defaultLocale] ?? cmd.description,
      commandAlias: (
        (cmd.aliases[commandTypes.prefix].length ? `${capitalize(commandTypes.prefix)}: ${cmd.aliases[commandTypes.prefix].join(', ')}\n` : '')
        + (cmd.aliases[commandTypes.slash].length ? `${capitalize(commandTypes.slash)}: ${cmd.aliases[commandTypes.slash].join(', ')}` : '')
        || lang('global.none')
      ).trim().replaceAll('\n', '<br>&nbsp')
    });

    return acc;
  }, []);

  commandList.sort((a, b) => a.category == 'others' ? 1 : b.list.length - a.list.length);
  return commandList.map(e => {
    e.category = lang(`commands.${e.category}.categoryName`);
    e.aliasesDisabled = !e.list.some(e => e.commandAlias != lang('global.none'));
    return e;
  });
};