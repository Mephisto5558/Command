module.exports = function getCallerFilePath(dirname) {
  /* eslint-disable-next-line unicorn/error-message */
  const line = new Error().stack.split('\n').find(e => e.includes(dirname));

  return line.slice(line.lastIndexOf('(') + 1, line.lastIndexOf('.js') + 3);
};