/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- using index signature to improve readability for lib user */

import type {
  ApplicationCommand, ApplicationCommandOptionType, ApplicationCommandType, CacheType,
  ChatInputCommandInteraction as _ChatInputCommandInteraction, Client, ClientApplication, Message, PermissionFlags,
  PermissionsBitField, _NonNullableFields
} from 'discord.js';
import type { I18nProvider, Locale, Translator } from '@mephisto5558/i18n';
import type {
  ChatInputCommandInteraction, CommandType, DefaultOptionType, OptionsG,
  ResolveContext, SharedConfig, commandDoneFn, commandTypes, customPermissionChecksFn
} from '../..';
import type { CooldownsManager, commandMention } from '../../utils/index.js';
import type {
  CommandOptionConfig, RunnableReturns as OptionRunnableReturns, StrictCommandOption, ValidateOptionsArray
} from '../commandOption';
import type { Logger } from '../../CommandManager';


type StrictCommand<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends readonly (CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>)[] = readonly DefaultOptionType<CT, DM>[]
> = Command<NoInfer<CT>, NoInfer<DM>, NoInfer<Options>>;

/**
 * This is more limited than what's actually allowed to enforce consitency.
 *
 * day, hour, minute, second, millisecond */
type TimeUnits = ['d', 'h', 'min', 's', 'ms'];
export type validTimeString = BuildOrderedCooldown<TimeUnits>;


export type CooldownTypes = 'guild' | 'channel' | 'user';
type Cooldowns = { [K in CooldownTypes]: validTimeString } & {};

export type RunnableReturns = ['nonBeta']
  | ['disabled', string]
  | ['slashOnly', Command['mention']]
  | ['guildOnly']
  | ['nsfw']
  | ['cooldown', string]
  | OptionRunnableReturns;

export interface CommandConfig<
  CT extends readonly CommandType[], DM extends boolean,
  Options extends OptionsG<CT, DM> = readonly DefaultOptionType<CT, DM>[]
> extends SharedConfig<DM> {
  types: CT;
  usage?: { usage?: string; examples?: string } & {};
  aliases?: { [K in NoInfer<CT>[number]]?: string[] } & {};
  permissions?: { client?: PermissionFlags[keyof PermissionFlags][]; user?: PermissionFlags[keyof PermissionFlags][] } & {};

  options?: ValidateOptionsArray<Options, CT, DM>;

  noDefer?: boolean;
  ephemeralDefer?: boolean;

  beta?: true;

  run: StrictCommand<CT, DM, Options>['run'];
}

export declare class Command<
  const CT extends readonly CommandType[] = [],
  const DM extends boolean = false,
  const Options extends readonly (
    CommandOptionConfig<CT, DM> | StrictCommandOption<CT, DM>
  )[] = readonly DefaultOptionType<CT, DM>[]
> {
  name: Lowercase<string>;
  id: `commands.${Command['category']}.${Command['name']}`;
  commandId: ['slash'] extends NoInfer<CT> ? Snowflake : undefined;

  /** Currently not used */
  nameLocalizations?: Partial<Record<Locale, Lowercase<string>>>;

  description: string;
  descriptionLocalizations: Partial<Record<Locale, string>>;

  category: Lowercase<string>;

  type: ApplicationCommandType;
  types: CT;

  usage: { [K in 'usage' | 'examples']: string | undefined } & {};
  usageLocalizations: Partial<Record<Locale, StrictCommand<CT, DM>['usage']>>;

  aliases: { [K in NoInfer<CT>[number]]: string[] } & {};
  cooldowns: { [K in CooldownTypes]: number } & {};

  permissions: { [K in 'client' | 'user']: PermissionFlags[keyof PermissionFlags][] } & {};
  get defaultMemberPermissions(): PermissionsBitField;

  dmPermission: DM;

  disabled: boolean;
  disabledReason: string | undefined;

  noDefer: boolean;
  ephemeralDefer: boolean;

  options: StrictCommandOption<CT, DM>[];

  beta?: boolean;

  config: {
    devIds: Set<Snowflake>; devOnlyCategories: Set<string>;
    runBetaCommandsOnly: boolean;
    replyOn: { disabled: boolean; nonBeta: boolean };
  };

  get mention(): ReturnType<typeof commandMention>;

  run: (
    this: ResolveContext<{
      slash: ChatInputCommandInteraction<DM extends false ? 'cached' : CacheType, Options>;
      prefix: Message<DM extends false ? true : false>;
    }, NoInfer<CT>>,
    lang: Translator, client: Client
  ) => Promise<never>;

  constructor(config: CommandConfig<CT, DM, Options>);

  init(i18n: I18nProvider, name: string, category: string, config?: {
    logger?: Logger;
    doneFn?: commandDoneFn<StrictCommand<CT, DM>>;
    customPermissionChecks?: customPermissionChecksFn<StrictCommand<CT, DM>>;

    devIds?: Set<Snowflake>; devOnlyCategories?: Set<string>;
    runBetaCommandsOnly?: boolean;
    replyOn?: { disabled?: boolean; nonBeta?: boolean };
    cooldownsManager?: CooldownsManager;
  }): this;

  /**
   * @returns the currect cooldown for this command or the subcommand(group) (whichever is higher) in ms.
   * Resets it if it's `0`. */
  /* eslint-disable-next-line @typescript-eslint/no-unused-private-class-members */
  private updateCooldowns(interaction: ThisParameterType<StrictCommand<CT, DM>['run']>): number;

  async runWrapper(Interaction: ThisParameterType<StrictCommand<CT, DM>['run']>, i18n: I18nProvider, locale: Locale): Promise<never>;

  findOption(
    option: { name: string; type?: ApplicationCommandOptionType },
    interaction?: ThisParameterType<StrictCommand<[typeof commandTypes.slash], DM>['run']>
  ): StrictCommandOption<CT, DM> | undefined;

  isEqualTo(cmd?: Command<CommandType[], boolean> | ApplicationCommand): boolean;
}