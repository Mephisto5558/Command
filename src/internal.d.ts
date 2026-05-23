// This file does not get served and is only there to add typing info for the lib's own code.

import type {
  AutocompleteInteraction as _AutocompleteInteraction, ChatInputCommandInteraction as _ChatInputCommandInteraction, DMChannel as _DMChannel,
  GuildTextBasedChannel as _GuildTextBasedChannel, Message as _Message, MessageComponentInteraction as _MessageComponentInteraction
} from 'discord.js';

// Declaring them this way allows to inherit discord.js's properties without interfering with the lib user's own declaration.
declare module './index.ts' {
  /* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
    -- Extending from discord.js to have local type information. */
  interface ChatInputCommandInteraction<
    CTX extends AllContexts = AllContexts,
    Options extends readonly unknown[] = []
  > extends StrictOmit<_ChatInputCommandInteraction<ContextToCaching<CTX>>, 'options'> {}

  interface Message<CTX extends AllContexts = AllContexts>
    extends _Message<ContextToInGuild<CTX>> {}

  interface AutocompleteInteraction<CTX extends AllContexts = AllContexts>
    extends _AutocompleteInteraction<ContextToCaching<CTX>> {}

  interface MessageComponentInteraction<CTX extends AllContexts = AllContexts>
    extends _MessageComponentInteraction<ContextToCaching<CTX>> {}

  /* eslint-enable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
}