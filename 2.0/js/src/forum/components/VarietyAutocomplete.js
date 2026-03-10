/**
 * Attaches "variety" word autocomplete to a textarea.
 * Shows the suggestion as plain gray text (ghost) at the current caret; Tab or click converts it to real text.
 */
export function attachVarietyAutocomplete(textarea, list, options) {
  if (!textarea || !Array.isArray(list) || list.length === 0) return () => {};

  let ghostEl = null;
  let currentSuggestion = null; // { full, suffix, startOffset, endOffset }

  function hideSuggestion() {
    currentSuggestion = null;
    if (ghostEl && ghostEl.parentNode) {
      ghostEl.parentNode.removeChild(ghostEl);
      ghostEl = null;
    }
  }

  /**
   * Get caret position in viewport (px) using a mirror div so text wraps like the textarea.
   */
  function getCaretPixelPosition(cursorOffset) {
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    const mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.position = 'fixed';
    mirror.style.left = rect.left + 'px';
    mirror.style.top = rect.top + 'px';
    mirror.style.width = textarea.offsetWidth + 'px';
    mirror.style.height = textarea.offsetHeight + 'px';
    mirror.style.padding = style.padding;
    mirror.style.font = style.font;
    mirror.style.fontSize = style.fontSize;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.whiteSpace = style.whiteSpace;
    mirror.style.wordWrap = style.wordWrap;
    mirror.style.overflow = 'auto';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.boxSizing = style.boxSizing;
    mirror.style.border = style.border;
    mirror.style.borderWidth = style.borderWidth;

    const textBefore = textarea.value.slice(0, cursorOffset);
    const span = document.createElement('span');
    span.setAttribute('data-caret', '');
    mirror.appendChild(document.createTextNode(textBefore));
    mirror.appendChild(span);
    document.body.appendChild(mirror);
    mirror.scrollTop = textarea.scrollTop;
    mirror.scrollLeft = textarea.scrollLeft;

    const spanRect = span.getBoundingClientRect();
    const left = spanRect.left;
    const top = spanRect.top;
    mirror.parentNode.removeChild(mirror);
    return { left, top };
  }

  function showSuggestion(suffix) {
    hideSuggestion();
    if (!suffix || !currentSuggestion) return;

    const cursorOffset = currentSuggestion.endOffset;
    const { left, top } = getCaretPixelPosition(cursorOffset);

    ghostEl = document.createElement('span');
    ghostEl.className = 'VarietyAutocomplete-ghost';
    ghostEl.textContent = suffix;
    ghostEl.style.position = 'fixed';
    ghostEl.style.left = left + 'px';
    ghostEl.style.top = top + 'px';
    ghostEl.style.zIndex = '10000';
    ghostEl.style.pointerEvents = 'auto';
    ghostEl.style.cursor = 'pointer';
    ghostEl.style.color = '#999';
    ghostEl.style.whiteSpace = 'pre';
    document.body.appendChild(ghostEl);

    ghostEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      acceptSuggestion();
    });
    ghostEl.addEventListener('click', (e) => {
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

    // Try execCommand for better framework compatibility (same as Flarum core insertText)
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
    if (currentSuggestion && ghostEl) {
      const { left, top } = getCaretPixelPosition(currentSuggestion.endOffset);
      ghostEl.style.left = left + 'px';
      ghostEl.style.top = top + 'px';
    }
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
