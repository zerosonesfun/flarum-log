/**
 * Attaches "variety" word autocomplete to a textarea.
 * Only suggests the single word immediately after "variety" on a line (case-insensitive).
 * list: array of allowed words/phrases. prefixMatch: suggest when typed fragment matches.
 * onAccept: called with (fullWord, insertSuffix) - insertSuffix is the part to insert after cursor (e.g. "rong" for "strong").
 */
export function attachVarietyAutocomplete(textarea, list, options) {
  if (!textarea || !Array.isArray(list) || list.length === 0) return () => {};

  let suggestionEl = null;
  let currentSuggestion = null; // { full: 'strong', suffix: 'rong', startOffset, endOffset }

  function hideSuggestion() {
    currentSuggestion = null;
    if (suggestionEl && suggestionEl.parentNode) {
      suggestionEl.parentNode.removeChild(suggestionEl);
      suggestionEl = null;
    }
  }

  function showSuggestion(suffix, rect) {
    hideSuggestion();
    if (!suffix || !options.createSuggestionElement) return;
    suggestionEl = options.createSuggestionElement(suffix, () => acceptSuggestion());
    const container = options.getSuggestionContainer ? options.getSuggestionContainer() : textarea.parentNode;
    if (container) {
      container.style.position = container.style.position || 'relative';
      suggestionEl.style.position = 'absolute';
      suggestionEl.style.left = (rect ? rect.left : 0) + 'px';
      suggestionEl.style.top = (rect ? rect.bottom : textarea.offsetHeight) + 'px';
      suggestionEl.style.zIndex = '1000';
      suggestionEl.style.pointerEvents = 'auto';
      container.appendChild(suggestionEl);
    }
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
    const rect = textarea.getBoundingClientRect();
    const containerRect = textarea.parentNode.getBoundingClientRect();
    showSuggestion(suffix, {
      left: 0,
      top: rect.bottom - containerRect.top,
      bottom: rect.bottom - containerRect.top + 24,
    });
  }

  function acceptSuggestion() {
    if (!currentSuggestion) return false;
    const start = currentSuggestion.startOffset;
    const end = currentSuggestion.endOffset;
    const text = textarea.value;
    const newText = text.slice(0, start) + currentSuggestion.full + text.slice(end);
    textarea.value = newText;
    setCaretOffset(textarea, start + currentSuggestion.full.length);
    hideSuggestion();
    if (options.onChange) options.onChange(newText);
    return true;
  }

  function onInput() {
    update();
  }

  function onKeyup() {
    update();
  }

  function onKeydown(e) {
    if (e.key === 'Tab' && currentSuggestion) {
      e.preventDefault();
      acceptSuggestion();
    }
  }

  textarea.addEventListener('input', onInput);
  textarea.addEventListener('keyup', onKeyup);
  textarea.addEventListener('keydown', onKeydown);

  return function detach() {
    hideSuggestion();
    textarea.removeEventListener('input', onInput);
    textarea.removeEventListener('keyup', onKeyup);
    textarea.removeEventListener('keydown', onKeydown);
  };
}
