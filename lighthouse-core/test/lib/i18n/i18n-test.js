/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const i18n = require('../../../lib/i18n/i18n.js');

/* eslint-env jest */

describe('i18n', () => {
  describe('#_formatPathAsString', () => {
    it('handles simple paths', () => {
      expect(i18n._formatPathAsString(['foo'])).toBe('foo');
      expect(i18n._formatPathAsString(['foo', 'bar', 'baz'])).toBe('foo.bar.baz');
    });

    it('handles array paths', () => {
      expect(i18n._formatPathAsString(['foo', 0])).toBe('foo[0]');
    });

    it('handles complex paths', () => {
      const propertyPath = ['foo', 'what-the', 'bar', 0, 'no'];
      expect(i18n._formatPathAsString(propertyPath)).toBe('foo[what-the].bar[0].no');
    });

    it('throws on unhandleable paths', () => {
      expect(() => i18n._formatPathAsString(['Bobby "DROP TABLE'])).toThrow(/Cannot handle/);
    });
  });

  describe('#createMessageInstanceIdFn', () => {
    it('returns a string reference', () => {
      const fakeFile = path.join(__dirname, 'fake-file.js');
      const templates = {daString: 'use me!'};
      const formatter = i18n.createMessageInstanceIdFn(fakeFile, templates);

      const expected = 'lighthouse-core/test/lib/i18n/fake-file.js | daString # 0';
      expect(formatter(templates.daString, {x: 1})).toBe(expected);
    });
  });

  describe('#replaceIcuMessageInstanceIds', () => {
    it('replaces the references in the LHR', () => {
      const templateID = 'lighthouse-core/test/lib/i18n/fake-file.js | daString';
      const reference = templateID + ' # 0';
      const lhr = {audits: {'fake-audit': {title: reference}}};

      const icuMessagePaths = i18n.replaceIcuMessageInstanceIds(lhr, 'en-US');
      expect(lhr.audits['fake-audit'].title).toBe('use me!');
      expect(icuMessagePaths).toEqual({
        [templateID]: [{path: 'audits[fake-audit].title', values: {x: 1}}]});
    });
  });

  describe('#getRendererFormattedStrings', () => {
    it('returns icu messages in the specified locale', () => {
      const strings = i18n.getRendererFormattedStrings('en-XA');
      expect(strings.passedAuditsGroupTitle).toEqual('[Þåššéð åûðîţš one two]');
      expect(strings.snippetCollapseButtonLabel).toEqual('[Çöļļåþšé šñîþþéţ one two]');
    });

    it('throws an error for invalid locales', () => {
      expect(_ => i18n.getRendererFormattedStrings('not-a-locale'))
        .toThrow(`Unsupported locale 'not-a-locale'`);
    });
  });

  describe('#getFormatted', () => {
    it('throws an error for invalid locales', () => {
      // Populate a string to try to localize to a bad locale.
      const UIStrings = {testMessage: 'testy test'};
      const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

      expect(_ => i18n.getFormatted(str_(UIStrings.testMessage), 'still-not-a-locale'))
        .toThrow(`Unsupported locale 'still-not-a-locale'`);
    });
  });

  describe('#lookupLocale', () => {
    it('canonicalizes the locale', () => {
      expect(i18n.lookupLocale('en-xa')).toEqual('en-XA');
    });

    it('falls back to root tag prefix if specific locale not available', () => {
      expect(i18n.lookupLocale('en-JKJK')).toEqual('en');
    });

    it('falls back to en if no match is available', () => {
      expect(i18n.lookupLocale('jk-Latn-DE-1996-a-ext-x-phonebk-i-klingon')).toEqual('en');
    });
  });

  describe('Message values are properly formatted', () => {
    // Message strings won't be in locale files, so will fall back to values given here.
    const UIStrings = {
      helloWorld: 'Hello World',
      helloBytesWorld: 'Hello {in, number, bytes} World',
      helloMsWorld: 'Hello {in, number, milliseconds} World',
      helloSecWorld: 'Hello {in, number, seconds} World',
      helloTimeInMsWorld: 'Hello {timeInMs, number, seconds} World',
      helloPercentWorld: 'Hello {in, number, extendedPercent} World',
      helloWorldMultiReplace: '{hello} {world}',
      helloPlural: '{itemCount, plural, =1{1 hello} other{hellos}}',
      helloPluralNestedICU: '{itemCount, plural, ' +
        '=1{1 hello {in, number, bytes}} ' +
        'other{hellos {in, number, bytes}}}',
      helloPluralNestedPluralAndICU: '{itemCount, plural, ' +
        '=1{{innerItemCount, plural, ' +
          '=1{1 hello 1 goodbye {in, number, bytes}} ' +
          'other{1 hello, goodbyes {in, number, bytes}}}} ' +
        'other{{innerItemCount, plural, ' +
          '=1{hellos 1 goodbye {in, number, bytes}} ' +
          'other{hellos, goodbyes {in, number, bytes}}}}}',
    };
    const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

    it('formats a basic message', () => {
      const helloStr = str_(UIStrings.helloWorld);
      expect(helloStr).toBeDisplayString('Hello World');
    });

    it('formats a message with bytes', () => {
      const helloBytesStr = str_(UIStrings.helloBytesWorld, {in: 1875});
      expect(helloBytesStr).toBeDisplayString('Hello 2 World');
    });

    it('formats a message with milliseconds', () => {
      const helloMsStr = str_(UIStrings.helloMsWorld, {in: 432});
      expect(helloMsStr).toBeDisplayString('Hello 430 World');
    });

    it('formats a message with seconds', () => {
      const helloSecStr = str_(UIStrings.helloSecWorld, {in: 753});
      expect(helloSecStr).toBeDisplayString('Hello 753.0 World');
    });

    it('formats a message with seconds timeInMs', () => {
      const helloTimeInMsStr = str_(UIStrings.helloTimeInMsWorld, {timeInMs: 753543});
      expect(helloTimeInMsStr).toBeDisplayString('Hello 753.5 World');
    });

    it('formats a message with extended percent', () => {
      const helloPercentStr = str_(UIStrings.helloPercentWorld, {in: 0.43078});
      expect(helloPercentStr).toBeDisplayString('Hello 43.08% World');
    });

    it('throws an error when values are needed but not provided', () => {
      expect(_ => i18n.getFormatted(str_(UIStrings.helloBytesWorld), 'en-US'))
      .toThrow(`ICU Message contains a value reference ("in") that wasn't provided`);
    });

    it('throws an error when a value is missing', () => {
      expect(_ => i18n.getFormatted(str_(UIStrings.helloWorldMultiReplace,
        {hello: 'hello'}), 'en-US'))
      .toThrow(`ICU Message contains a value reference ("world") that wasn't provided`);
    });

    it('formats a message with plurals', () => {
      const helloStr = str_(UIStrings.helloPlural, {itemCount: 3});
      expect(helloStr).toBeDisplayString('hellos');
    });

    it('throws an error when a plural control value is missing', () => {
      expect(_ => i18n.getFormatted(str_(UIStrings.helloPlural), 'en-US'))
      .toThrow(`ICU Message contains a value reference ("itemCount") that wasn't provided`);
    });

    it('formats a message with plurals and nested custom ICU', () => {
      const helloStr = str_(UIStrings.helloPluralNestedICU, {itemCount: 3, in: 1875});
      expect(helloStr).toBeDisplayString('hellos 2');
    });

    it('formats a message with plurals and nested custom ICU and nested plural', () => {
      const helloStr = str_(UIStrings.helloPluralNestedPluralAndICU, {itemCount: 3,
        innerItemCount: 1,
        in: 1875});
      expect(helloStr).toBeDisplayString('hellos 1 goodbye 2');
    });
  });
});
