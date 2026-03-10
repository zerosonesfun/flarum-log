import getCaretCoordinates from 'textarea-caret';

/**
 * Attaches "variety" word autocomplete to a textarea.
 * Suggestion appears as plain gray text at the caret; Tab or click converts it to real text.
 */
export function attachVarietyAutocomplete(textarea, list, options) {
  if (!textarea || !Array.isArray(list) || list.length === 0) return () => {};

  let suggestionEl = null;
  let currentSuggestion = null; // { full, suffix, startOffset, endOffset }

  function hideSuggestion() {
    currentSuggestion = null;
    if (suggestionEl && suggestionEl.parentNode) {
      suggestionEl.parentNode.removeChild(suggestionEl);
      suggestionEl = null;
    }
  }

  /** Get caret position in viewport (px) using textarea-caret (same approach as Flarum core). */
  function getCaretPixelPosition(cursorOffset) {
    const rect = textarea.getBoundingClientRect();
    const coords = getCaretCoordinates(textarea, cursorOffset);
    return {
      left: rect.left + coords.left - textarea.scrollLeft,
      top: rect.top + coords.top - textarea.scrollTop,
    };
  }

  function positionGhostAtCaret() {
    if (!suggestionEl || !currentSuggestion) return;
    const { left, top } = getCaretPixelPosition(currentSuggestion.endOffset);
    suggestionEl.style.left = left + 'px';
    suggestionEl.style.top = (top - 1.2) + 'px';
  }

  function showSuggestion(suffix) {
    // Remove previous suggestion DOM only; do not clear currentSuggestion here (caller set it).
    if (suggestionEl && suggestionEl.parentNode) {
      suggestionEl.parentNode.removeChild(suggestionEl);
      suggestionEl = null;
    }
    if (!suffix || !currentSuggestion) return;

    suggestionEl = document.createElement('span');
    suggestionEl.className = 'VarietyAutocomplete-ghost';
    suggestionEl.textContent = suffix;
    document.body.appendChild(suggestionEl);
    suggestionEl.style.position = 'fixed';
    suggestionEl.style.zIndex = '10000';
    suggestionEl.style.pointerEvents = 'auto';
    suggestionEl.style.cursor = 'pointer';
    suggestionEl.style.color = '#666';
    suggestionEl.style.whiteSpace = 'pre';
    positionGhostAtCaret();

    suggestionEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      acceptSuggestion();
    });
    suggestionEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  function getCaretOffset(el) {
    if (el.selectionStart !== undefined) return el.selectionStart;
    return 0;
  }

  function setCaretOffset(el, start, end) {
    if (el.setSelectionRange) {
      el.setSelectionRange(start, end !== undefined ? end : start);
    }
    el.focus();
  }

  function getLineAtOffset(text, offset) {
    const before = text.slice(0, offset);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = text.indexOf('\n', offset);
    const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
    return { line: text.slice(lineStart, lineEndIdx), lineStart, lineEnd: lineEndIdx };
  }

  /**
   * Insert/replace text in textarea (like Flarum's insertText). Updates composer state via onChange.
   */
  function replaceRangeAndSync(start, end, newText) {
    const text = textarea.value;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const newValue = before + newText + after;
    const newCaret = start + newText.length;

    textarea.setSelectionRange(start, end);
    textarea.focus();
    let didExec = false;
    try {
      textarea.contentEditable = 'true';
      didExec = document.execCommand('insertText', false, newText);
      textarea.contentEditable = 'false';
    } catch (err) {
      textarea.contentEditable = 'false';
    }

    if (!didExec) {
      textarea.value = newValue;
    }
    setCaretOffset(textarea, newCaret);
    if (options.onChange) options.onChange(textarea.value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function update() {
    const text = textarea.value;
    const offset = getCaretOffset(textarea);
    const { line, lineStart, lineEnd } = getLineAtOffset(text, offset);
    const lineOffsetInText = lineStart;
    const cursorInLine = offset - lineOffsetInText;

    if (!/variety/i.test(line)) {
      hideSuggestion();
      return;
    }

    const varietyMatch = line.match(/variety\s+/i);
    if (!varietyMatch) {
      hideSuggestion();
      return;
    }
    const wordStartInLine = varietyMatch.index + varietyMatch[0].length;
    if (cursorInLine <= wordStartInLine) {
      hideSuggestion();
      return;
    }
    const prefix = line.slice(wordStartInLine, cursorInLine);
    if (/\s/.test(prefix)) {
      hideSuggestion();
      return;
    }
    if (prefix.length < 2) {
      hideSuggestion();
      return;
    }
    const prefixLower = prefix.toLowerCase();
    const wordEndInLine = wordStartInLine + prefix.length;
    const matches = list.filter((w) => w.toLowerCase().slice(0, prefixLower.length) === prefixLower && w.length > prefixLower.length);
    if (matches.length === 0) {
      hideSuggestion();
      return;
    }
    const best = matches.find((w) => w.toLowerCase() === prefixLower) || matches[0];
    const suffix = best.slice(prefixLower.length);
    currentSuggestion = {
      full: best,
      suffix,
      startOffset: lineOffsetInText + wordStartInLine,
      endOffset: lineOffsetInText + wordEndInLine,
    };
    showSuggestion(suffix);
  }

  function acceptSuggestion() {
    if (!currentSuggestion) return false;
    const { startOffset, endOffset, full } = currentSuggestion;
    hideSuggestion();
    replaceRangeAndSync(startOffset, endOffset, full);
    return true;
  }

  function scheduleUpdate() {
    requestAnimationFrame(() => update());
  }

  function onKeydown(e) {
    if (e.key === 'Tab' && currentSuggestion) {
      e.preventDefault();
      acceptSuggestion();
      return;
    }
    scheduleUpdate();
  }

  function onScroll() {
    positionGhostAtCaret();
  }

  textarea.addEventListener('input', scheduleUpdate);
  textarea.addEventListener('keyup', scheduleUpdate);
  textarea.addEventListener('keydown', onKeydown);
  textarea.addEventListener('scroll', onScroll);

  return function detach() {
    hideSuggestion();
    textarea.removeEventListener('input', scheduleUpdate);
    textarea.removeEventListener('keyup', scheduleUpdate);
    textarea.removeEventListener('keydown', onKeydown);
    textarea.removeEventListener('scroll', onScroll);
  };
}
