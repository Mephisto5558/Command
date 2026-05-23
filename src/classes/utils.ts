// @ts-expect-error Cannot augment that module
import { getMilliseconds as getMilliseconds_ } from 'better-ms';

import type { Locale, Translator } from '@mephisto5558/i18n';
import type {
  AllContexts, AutocompleteInteraction, BetterMS, ChatInputCommandInteraction, Command,
  CooldownType, Message, MessageComponentInteraction, validTimeString
} from '../index.ts';
import type { CommandOption } from './commandOption/index.ts';

export const getMilliseconds = getMilliseconds_ as typeof BetterMS.getMilliseconds;

export function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (!a?.toString() && !b?.toString()) return true;
  if (typeof a == 'string' || typeof b == 'string') return a == b;
  if (a == undefined && !Object.keys(b ?? {}).length || b == undefined && !Object.keys(a ?? {}).length) return true;

  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;

  const
    keysA = Object.keys(a),
    keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;
  for (const key of keysA)
    if (!equal(a[key], b[key])) return false;

  return true;
}

export function cooldownConverter(
  cooldown: Partial<Record<CooldownType, validTimeString>>,
  k: keyof Command['cooldowns'], v: Command['cooldowns'][keyof Command['cooldowns']]
): [keyof Command['cooldowns'], number] {
  if (!cooldown[k]) return [k, v];

  const ms = getMilliseconds(cooldown[k]);
  if (typeof ms != 'number') throw new TypeError(`Could not convert time string cooldowns.${k} "${cooldown[k]}" to milliseconds.`);

  return [k, ms];
}

export class CommandExecutionError extends Error {
  override readonly name = 'CommandExecutionError';
  interaction: ChatInputCommandInteraction | Message | MessageComponentInteraction | AutocompleteInteraction;
  translator: Translator<boolean, Locale>;

  constructor(
    message: string | undefined, interaction: CommandExecutionError['interaction'],
    translator: CommandExecutionError['translator'], options?: ErrorOptions
  ) {
    super(message, options);

    this.interaction = interaction;
    this.translator = translator;
  }
}

export class CommandValidationError<CT extends readonly CommandType[], CTX extends AllContexts> extends Error {
  override readonly name = 'CommandValidationError';
  readonly command?: Command<NoInfer<CT>, NoInfer<CTX>>;
  readonly commandOption?: CommandOption<NoInfer<CT>, NoInfer<CTX>>;

  constructor(
    message: string | undefined,
    command?: Command<NoInfer<CT>, NoInfer<CTX>>,
    commandOption?: CommandOption<NoInfer<CT>, NoInfer<CTX>>,
    options?: ErrorOptions
  ) {
    super(message, options);

    if (command) this.command = command;
    if (commandOption) this.commandOption = commandOption;
  }
}

export enum CommandType {
  Slash = 'slash',
  Prefix = 'prefix',
  Component = 'component'
}