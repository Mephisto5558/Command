module.exports = function getCallerFilePath() {
  /* eslint-disable-next-line unicorn/error-message */
  const stack = new Error().stack.split('\n');

  return stack[2].slice(
    stack[2].lastIndexOf('(') + 1,
    stack[2].lastIndexOf('.js') + 3
  );
};