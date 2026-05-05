// This file does not get served and is only there to add typing info for the lib's own code.

import type {
  AutocompleteInteraction as _AutocompleteInteraction, ChatInputCommandInteraction as _ChatInputCommandInteraction, DMChannel as _DMChannel,
  GuildTextBasedChannel as _GuildTextBasedChannel, Message as _Message, MessageComponentInteraction as _MessageComponentInteraction
} from 'discord.js';

// Declaring them this way allows to inherit discord.js's properties without interfering with the lib user's own declaration.
declare module './index.ts' {
  /* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
  interface ChatInputCommandInteraction<DM extends DMPermType = DMPermType.CanBeDM, Options extends readonly unknown[] = []>
    extends StrictOmit<_ChatInputCommandInteraction<DMPermTypeToCaching[DM]>, 'options'> {}

  interface Message<DM extends DMPermType = DMPermType.CanBeDM>
    extends _Message<DMPermTypeToInGuild[DM]> {}

  interface AutocompleteInteraction<DM extends DMPermType = DMPermType.CanBeDM>
    extends _AutocompleteInteraction<DMPermTypeToCaching[DM]> {}

  interface MessageComponentInteraction<DM extends DMPermType = DMPermType.CanBeDM>
    extends _MessageComponentInteraction<DMPermTypeToCaching[DM]> {}

  /* eslint-enable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
}