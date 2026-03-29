/** Formats an application command name and id into a command mention. */
export default function commandMention<CommandName extends string, CommandId extends Snowflake | '' | undefined>(
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion */
  name: CommandName, id: CommandId = '' as CommandId
): `</${CommandName}:${CommandId}>` {
  return `</${name}:${id}>`;
}