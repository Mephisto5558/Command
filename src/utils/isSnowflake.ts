export default function isSnowflake(str: string & {} | Snowflake): str is Snowflake {
  return /^\d*$/.test(str);
}