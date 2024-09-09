import type Discord from 'discord.js';
import type I18nProvider from '@mephisto5558/i18n';
import type Commands from './commands';

export type { lang, logger };
export * from './commands';
export { updateApplicationCommands };

declare function updateApplicationCommands<CMDs extends Map<string, Commands.SlashCommand<boolean> | Commands.MixedCommand<boolean>>>(
  app: Discord.ClientApplication, commands: CMDs,
  logger: logger, loggerOptions: { hideDisabledCommandLog?: boolean; hideNonBetaCommandLog?: boolean }
): Promise<CMDs>;

declare module 'discord.js' {
  // @ts-expect-error Overwriting
  type Snowflake = `${number}`;
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
type lang = bBoundFunction<I18nProvider['__'], (this: I18nProvider, key: string, replacements?: string | object) => string>;

type logger = { log: typeof console['log']; warn: typeof console['warn']; error: typeof console['error'] };