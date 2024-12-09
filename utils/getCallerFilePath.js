const fileExtention = '.js';

module.exports = function getCallerFilePath(dirname) {
  /* eslint-disable-next-line unicorn/error-message -- not an Error that will ever get thrown. */
  const line = new Error().stack.split('\n').find(e => e.includes(dirname));
  return line.slice(line.lastIndexOf('(') + 1, line.lastIndexOf(fileExtention) + fileExtention.length);
};