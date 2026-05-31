import config, { getModifiedRule, jsGlob, pluginNames, tsGlob } from '@mephisto5558/eslint-config';

export default [
  ...config,
  {
    name: 'templates',
    files: [`templates/*${tsGlob}`, `templates/*${jsGlob}`],
    rules: {
      [`${pluginNames.typescript}/no-empty-function`]: 'off',
      [`${pluginNames.typescript}/no-unused-vars`]: 'off'
    }
  },
  {
    name: 'overwrite:scripts',
    files: [`**/*${tsGlob}`, `**/*${jsGlob}`],
    languageOptions: {
      globals: {}
    },
    rules: {
      ...getModifiedRule(config, 'no-underscore-dangle', [{
        allow: [
          '__count__' // Object#count
        ]
      }]),
      'max-lines': 'off', // Class definitions may just be longer.
      [`${pluginNames.typescript}/consistent-type-definitions`]: 'off', // Using interfaces where needed
      ...getModifiedRule(config, `${pluginNames.import}/no-namespace`, [{
        ignore: ['discord.js'] // prevent ugly renaming
      }]),
      '@typescript-eslint/no-unsafe-type-assertion': 'off', // todo
      'sonarjs/cognitive-complexity': 'off', // todo
      'custom/cyclomatic-complexity': 'off', // todo
      'sonarjs/expression-complexity': 'off' // todo
    }
  },
  {
    name: 'overwrite:Tests',
    files: [`./tests/**/*${jsGlob}`],
    rules: {
      ...getModifiedRule(config, 'id-length', [{
        exceptions: ['t']
      }]),
      [`${pluginNames.typescript}/no-magic-numbers`]: 'off',
      [`${pluginNames.unicorn}/no-null`]: 'off'
    }
  }
] as typeof config;