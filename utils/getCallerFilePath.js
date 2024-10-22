module.exports = function getCallerFilePath(dirname) {
  const
    /* eslint-disable-next-line unicorn/error-message -- not an Error that will ever get thrown.*/
    line = new Error().stack.split('\n').find(e => e.includes(dirname)),
    extention = '.js';

  return line.slice(line.lastIndexOf('(') + 1, line.lastIndexOf(extention) + extention.length);
};