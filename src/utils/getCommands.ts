import { CommandType } from '../classes/utils.ts';
import capitalize from './capitalize.ts';
import type { Client } from 'discord.js';
import type { Locale, Translator } from '@mephisto5558/i18n';
import type { Command, CommandManager } from '../index.ts';

type category = { category: string; subTitle: ''; aliasesDisabled: boolean; list: command[] };
type command = { commandName: string; commandUsage: string; commandDescription: string; commandAlias: string };

export default function getCommands(
  this: Client,
  lang: Translator<true, Locale>,
  commands: CommandManager.CommandManager['commands'],
  excludeCategories?: Command.Command['category'][]
): category[] {
  const commandList = commands.reduce<category[]>((acc, cmd) => {
    if (excludeCategories?.includes(cmd.category) || cmd.disabled) return acc;

    let category = acc.find(e => e.category == cmd.category);
    if (!category) {
      category = {
        category: cmd.category,
        subTitle: '',
        aliasesDisabled: false,
        list: []
      };
      acc.push(category);
    }

    category.list.push({
      commandName: cmd.name,
      commandUsage: (
        (cmd.types.includes(CommandType.slash) ? lang('others.getCommands.lookAtOptionDesc') ?? '' : '')
        + (lang(`${cmd.id}.usage.usage`)?.replaceAll(/slash command:/gi, '') ?? '') || (lang('others.getCommands.noInfo') ?? '')
      ).trim().replaceAll('\n', '<br>&nbsp'),
      commandDescription: cmd.descriptionLocalizations[lang.config.locale ?? lang.defaultConfig.defaultLocale] ?? cmd.description,
      commandAlias: (
        (cmd.aliases[CommandType.prefix].length ? `${capitalize(CommandType.prefix)}: ${cmd.aliases[CommandType.prefix].join(', ')}\n` : '')
        + (cmd.aliases[CommandType.slash].length ? `${capitalize(CommandType.slash)}: ${cmd.aliases[CommandType.slash].join(', ')}` : '')
        || (lang('global.none') ?? '')
      ).trim().replaceAll('\n', '<br>&nbsp')
    });

    return acc;
  }, []);

  commandList.sort((a, b) => a.category == 'others' ? 1 : b.list.length - a.list.length);
  return commandList.map(e => {
    e.category = lang(`commands.${e.category}.categoryName`) ?? '';
    e.aliasesDisabled = !e.list.some(e => e.commandAlias != lang('global.none'));
    return e;
  });
}