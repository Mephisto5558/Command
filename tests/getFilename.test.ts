import assert from 'node:assert/strict';
import { test as topLvlTest } from 'node:test';
import getFilename from '../src/utils/getFilename.ts';

/* eslint-disable-next-line id-length */
await topLvlTest('getFilename', { concurrency: true }, async t => Promise.allSettled([
  t.test('should return the getFilename without extension from a full path', () => {
    assert.equal(getFilename('/path/to/file.js'), 'file');
    assert.equal(getFilename(String.raw`C:\path\to\file.txt`), 'file');
  }),

  t.test('should return the getFilename without extension when there are multiple dots', () => {
    assert.equal(getFilename('/path/to/archive.tar.gz'), 'archive.tar');
  }),

  t.test('should return the full getFilename if there is no extension', () => {
    assert.equal(getFilename('/path/to/file'), 'file');
  }),

  t.test('should handle filenames starting with a dot (hidden files)', () => {
    assert.equal(getFilename('.env.example'), '.env');
    assert.equal(getFilename('.gitignore'), '.gitignore');
  }),

  t.test('should handle paths ending with a directory', () => {
    assert.equal(getFilename('/path/to/directory/'), 'directory');
    assert.equal(getFilename('/path/to/directory'), 'directory');
  }),

  t.test('should handle edge cases like empty strings or dots', () => {
    assert.equal(getFilename(''), '');
    assert.equal(getFilename('.'), '.');
    assert.equal(getFilename('..'), '..');
  }),

  t.test('should handle getFilename only without path', () => {
    assert.equal(getFilename('file.js'), 'file');
    assert.equal(getFilename('file'), 'file');
  }),

  t.test('should throw a TypeError for non-string inputs', () => {
    /* eslint-disable-next-line unicorn/no-null */
    assert.throws(() => getFilename(null), TypeError);
    assert.throws(() => getFilename(), TypeError);
    assert.throws(() => getFilename(123), TypeError);
    assert.throws(() => getFilename({}), TypeError);
  })
]));