/** Formats an application command name and id into a command mention. */
export default function commandMention<CommandName extends string, CommandId extends Snowflake | '' = ''>(
  name: CommandName, id: CommandId = '' as CommandId
): `</${CommandName}:${CommandId}>` {
  return `</${name}:${id}>`;
}