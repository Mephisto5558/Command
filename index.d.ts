import type I18nProvider from '@mephisto5558/i18n';

export type { lang };

type bBoundFunction<OF, T extends CallableFunction> = T & {

  /** The original, unbound function */
  __targetFunction__: OF;

  /** The context to which the function is bound */
  __boundThis__: ThisParameterType<T>;

  /** The arguments to which the function is bound */
  __boundArgs__: unknown[];
};

/** bBinded I18nProvider.__ function*/
type lang = bBoundFunction<I18nProvider['__'], (this: I18nProvider, key: string, replacements?: string | object) => string>;