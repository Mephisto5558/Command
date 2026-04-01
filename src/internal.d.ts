// This file does not get served and is only there to add typing info for the lib's own code.

import type {
  AutocompleteInteraction as _AutocompleteInteraction, ChatInputCommandInteraction as _ChatInputCommandInteraction,
  Message as _Message, MessageComponentInteraction as _MessageComponentInteraction
} from 'discord.js';

// Declaring them this way allows to inherit discord.js's properties without interfering with the lib user's own declaration.
declare module './index.ts' {
  /* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
  interface ChatInputCommandInteraction<DM extends boolean = boolean, Options extends readonly unknown[] = []>
    extends StrictOmit<_ChatInputCommandInteraction<DM extends false ? 'cached' : CacheType>, 'options'> {}

  interface Message<DM extends boolean = boolean>
    extends _Message<DM extends false ? true : boolean> {}

  interface AutocompleteInteraction<DM extends boolean = boolean>
    extends _AutocompleteInteraction<DM extends false ? 'cached' : CacheType> {}

  interface MessageComponentInteraction<DM extends boolean = boolean>
    extends _MessageComponentInteraction<DM extends false ? 'cached' : CacheType> {}

  /* eslint-enable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
}