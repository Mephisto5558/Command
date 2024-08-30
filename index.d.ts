import type Discord from 'discord.js';
import type I18nProvider from '@mephisto5558/i18n';
import type { SlashCommand } from './commands';

export type { lang };
export { SlashCommandCollection };
export * from './commands';

declare module 'discord.js' {
  // @ts-expect-error Overwriting
  type Snowflake = `${number}`;
}

declare class SlashCommandCollection {
  constructor(client: Discord.Client<true>);

  client: Discord.Client<true>;
  commandManager: Discord.ApplicationCommandManager;
  cache: Discord.ApplicationCommandManager['cache'];

  edit<T extends SlashCommand>(command: T, guildId?: Discord.Snowflake): Promise<T>;

  delete(id: Discord.Snowflake, guildId?: Discord.Snowflake): Promise<void>;
  clear(guildId?: Discord.Snowflake): Promise<void>;

  fetch<ID extends Discord.Snowflake | undefined = undefined>(
    id?: ID, guildId?: Discord.Snowflake
  ): Promise<ID extends Discord.Snowflake ? Discord.ApplicationCommand : Discord.Collection<Discord.Snowflake, Discord.ApplicationCommand>>;
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