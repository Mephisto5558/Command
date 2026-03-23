// @ts-expect-error Cannot augment that module
import { getMilliseconds as getMilliseconds_ } from 'better-ms';

import type { Locale, Translator } from '@mephisto5558/i18n';
import type { BetterMS, Command, CommandType } from '../index.ts';
import type { CommandConfig } from './command/utils.ts';

/* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion */
const getMilliseconds = getMilliseconds_ as typeof BetterMS.getMilliseconds;

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
  cooldown: NonNullable<CommandConfig<CommandType[], boolean>['cooldowns']>,
  k: keyof Command.Command['cooldowns'], v: Command.Command['cooldowns'][keyof Command.Command['cooldowns']]
): [keyof Command.Command['cooldowns'], number] {
  if (!cooldown[k]) return [k, v];

  const ms = getMilliseconds(cooldown[k]);
  if (typeof ms != 'number') throw new TypeError(`Could not convert time string cooldowns.${k} "${cooldown[k]}" to milliseconds.`);

  return [k, ms];
}

export class CommandExecutionError extends Error {
  override readonly name = 'CommandExecutionError';
  interaction: ThisParameterType<Command.Command<CommandType[], boolean>['run']>;
  translator: Translator<boolean, Locale>;

  constructor(
    message: string | undefined, interaction: CommandExecutionError['interaction'],
    translator: CommandExecutionError['translator'], options: ErrorOptions | undefined
  ) {
    super(message, options);

    this.interaction = interaction;
    this.translator = translator;
  }
}

export enum CommandTypes {
  slash = 'slash',
  prefix = 'prefix',
  component = 'component'
}