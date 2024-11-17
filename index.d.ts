import type { ApplicationCommand, ClientApplication } from 'discord.js';
import type I18nProvider from '@mephisto5558/i18n';
import type Commands from './commands';

/* eslint-disable-next-line sonarjs/no-wildcard-import */
export * from './commands.js';

/** @returns `true` if both are undefined, otherwise compares their values.*/
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

type bBoundFunction<OF, T extends CallableFunction> = T & {

  /** The original, unbound function */
  __targetFunction__: OF;

  /** The context to which the function is bound */
  __boundThis__: ThisParameterType<T>;

  /** The arguments to which the function is bound */
  __boundArgs__: unknown[];
};

/** bBinded I18nProvider.__ function*/
/* eslint-disable-next-line @typescript-eslint/no-unsafe-function-type */// @ts-expect-error Intentional little trick
export type lang = Function['bBind'] extends never ? never : bBoundFunction<I18nProvider['__'], (this: I18nProvider, key: string, replacements?: string | object) => string>;
export type logger = {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
};