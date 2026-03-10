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

  function showSuggestion(suffix) {
    hideSuggestion();
    if (!suffix || !options.createSuggestionElement) return;
    suggestionEl = options.createSuggestionElement(suffix, () => acceptSuggestion());
    const rect = textarea.getBoundingClientRect();
    document.body.appendChild(suggestionEl);
    suggestionEl.style.position = 'fixed';
    suggestionEl.style.left = rect.left + 'px';
    suggestionEl.style.top = (rect.top + rect.height + 4) + 'px';
    suggestionEl.style.zIndex = '10000';
    suggestionEl.style.pointerEvents = 'auto';
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
    showSuggestion(suffix);
  }

  function acceptSuggestion() {
    if (!currentSuggestion) return false;
    const start = currentSuggestion.startOffset;
    const end = currentSuggestion.endOffset;
    const text = textarea.value;
    const newText = text.slice(0, start) + currentSuggestion.full + text.slice(end);
    const newCaret = start + currentSuggestion.full.length;
    hideSuggestion();
    if (options.onChange) options.onChange(newText);
    textarea.value = newText;
    setCaretOffset(textarea, newCaret);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

  textarea.addEventListener('input', scheduleUpdate);
  textarea.addEventListener('keyup', scheduleUpdate);
  textarea.addEventListener('keydown', onKeydown);

  return function detach() {
    hideSuggestion();
    textarea.removeEventListener('input', scheduleUpdate);
    textarea.removeEventListener('keyup', scheduleUpdate);
    textarea.removeEventListener('keydown', onKeydown);
  };
}
