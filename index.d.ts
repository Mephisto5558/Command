import type { ApplicationCommand, ClientApplication, Locale } from 'discord.js';
import type { Translator } from '@mephisto5558/i18n';
import type Commands from './commands';

export * from './commands.js';

/** @returns `true` if both are undefined, otherwise compares their values. */
export declare function mapsEqual(a: Map<string, string | number | null | undefined> | undefined, b: typeof a): boolean;

export declare function slashCommandsEqual(
  a: Commands.SlashCommand | Commands.MixedCommand | Commands.CommandOption | ApplicationCommand | undefined,
  b: typeof a
): boolean;

type loggerOptions = { hideDisabledCommandLog?: boolean; hideNonBetaCommandLog?: boolean };
export declare function updateApplicationCommands<CMD extends Commands.SlashCommand | Commands.MixedCommand>(
  app: ClientApplication, commands: Map<CMD['name'], CMD & { skip?: true }>,
  loggerOptions: loggerOptions, logger?: logger
): Promise<Map<CMD['name'], CMD>>;

export declare function logWrapper(this: logger, options: loggerOptions, type: keyof logger): void;

declare module 'discord.js' {
  // @ts-expect-error Overwriting
  type Snowflake = `${bigint}`;
}

export type lang<UNF extends boolean = false, L extends Locale | undefined = Locale> = Translator<UNF, L>;
export type logger = {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;

  /** Internally used */
  _warn?: typeof console.warn;
  error: typeof console.error;

  /** Internally used */
  _error?: typeof console.error;
};