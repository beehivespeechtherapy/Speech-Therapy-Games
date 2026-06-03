/**
 * Resolve word clipart paths under word-images/_library/.
 */
(function (global) {
  'use strict';

  function imageFilename(word) {
    const trimmed = (word || '').trim();
    if (trimmed === 'v' || trimmed === 'V') return 'v.png';
    if (trimmed === 'Ed') return 'Ed.png';
    return trimmed + '.png';
  }

  function wordImagesRootFromPage() {
    if (typeof window === 'undefined' || !window.location) return '';
    const path = window.location.pathname.replace(/\/games\/[^/]+(\/.*)?$/, '');
    const origin = window.location.origin || '';
    return origin + (path.endsWith('/') ? path : path + '/');
  }

  /**
   * @param {string} word
   * @param {{ relativeBase?: string, legacyFolder?: string, useOrigin?: boolean }} [options]
   */
  function libraryImagePath(word, options) {
    const opts = options || {};
    const relativeBase = (opts.relativeBase != null ? opts.relativeBase : '../../word-images').replace(/\/$/, '');
    const filename = imageFilename(word);
    const libraryRel = relativeBase + '/_library/' + filename;

    if (opts.useOrigin !== false && typeof window !== 'undefined') {
      try {
        const root = wordImagesRootFromPage();
        if (root) {
          // Let URL() encode spaces and special chars once (avoid double-encoding %20).
          return new URL('word-images/_library/' + filename, root).href;
        }
      } catch (e) { /* fall through */ }
    }

    const legacyFolder = opts.legacyFolder;
    if (legacyFolder) {
      if (opts.useOrigin !== false && typeof window !== 'undefined') {
        try {
          const root = wordImagesRootFromPage();
          if (root) {
            return new URL('word-images/' + legacyFolder + '/' + filename, root).href;
          }
        } catch (e) { /* fall through */ }
      }
      return relativeBase + '/' + legacyFolder + '/' + filename;
    }

    return libraryRel;
  }

  global.WordImages = {
    imageFilename: imageFilename,
    libraryImagePath: libraryImagePath,
    wordImagesRootFromPage: wordImagesRootFromPage
  };
})(typeof window !== 'undefined' ? window : globalThis);
