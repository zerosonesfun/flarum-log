/**
 * Variety autocomplete using app.composer.editor (EditorDriverInterface).
 * For new discussion composer only. When a line contains "variety" and the user
 * has typed at least 2 characters in the word after it, suggest from the list.
 * Accept with Tab or click.
 */
export function startVarietyAutocomplete(app, getList) {
  let suggestionEl = null;
  let currentSuggestion = null; // { full, suffix, startOffset, endOffset }
  let intervalId = null;
  let keydownHandler = null;

  function getListArray() {
    let list = getList();
    if (typeof list === 'string') list = list.split(',').map((s) => s.trim()).filter(Boolean);
    return Array.isArray(list) ? list : [];
  }

  function hideSuggestion() {
    currentSuggestion = null;
    if (suggestionEl && suggestionEl.parentNode) {
      suggestionEl.parentNode.removeChild(suggestionEl);
      suggestionEl = null;
    }
  }

  function getLineAtOffset(text, offset) {
    const before = text.slice(0, offset);
    const lineStart = before.lastIndexOf('\n') + 1;
    const lineEnd = text.indexOf('\n', offset);
    const lineEndIdx = lineEnd === -1 ? text.length : lineEnd;
    return { line: text.slice(lineStart, lineEndIdx), lineStart, lineEnd: lineEndIdx };
  }

  function showSuggestion(suffix, editor, cursorPos) {
    hideSuggestion();
    if (!suffix || !editor.getCaretCoordinates) return;
    const coords = editor.getCaretCoordinates(cursorPos);
    const editorEl = document.querySelector('.Composer textarea') || document.querySelector('.Composer .TextEditor');
    if (!editorEl) return;
    const rect = editorEl.getBoundingClientRect();
    const left = rect.left + (coords.left || 0);
    const top = rect.top + (coords.top || 0) + 18;

    suggestionEl = document.createElement('button');
    suggestionEl.type = 'button';
    suggestionEl.className = 'VarietyAutocomplete-suggestion';
    suggestionEl.textContent = suffix;
    suggestionEl.style.cssText = 'position:fixed;left:' + left + 'px;top:' + top + 'px;z-index:9999;margin:0;padding:2px 6px;font-size:12px;cursor:pointer;background:#eee;border:1px solid #ccc;border-radius:3px;';
    suggestionEl.addEventListener('click', (e) => {
      e.preventDefault();
      acceptSuggestion();
    });
    document.body.appendChild(suggestionEl);
  }

  function acceptSuggestion() {
    if (!currentSuggestion || !app.composer || !app.composer.editor) return;
    const ed = app.composer.editor;
    ed.insertBetween(currentSuggestion.startOffset, currentSuggestion.endOffset, currentSuggestion.full, false);
    ed.moveCursorTo(currentSuggestion.startOffset + currentSuggestion.full.length);
    hideSuggestion();
  }

  function tick() {
    const composer = app.composer;
    const visible = typeof composer.visible === 'function' ? composer.visible() : composer.visible;
    if (!visible || !composer.editor || !composer.fields) {
      hideSuggestion();
      return;
    }
    const content = typeof composer.fields.content === 'function' ? composer.fields.content() : '';
    if (typeof content !== 'string') {
      hideSuggestion();
      return;
    }
    if (!composer.fields.title) {
      hideSuggestion();
      return;
    }
    const list = getListArray();
    if (list.length === 0) {
      hideSuggestion();
      return;
    }

    const range = composer.editor.getSelectionRange();
    if (!range || range.length < 2) {
      hideSuggestion();
      return;
    }
    const cursorPos = range[1];
    const { line, lineStart } = getLineAtOffset(content, cursorPos);
    const cursorInLine = cursorPos - lineStart;

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
      startOffset: lineStart + wordStartInLine,
      endOffset: lineStart + wordEndInLine,
    };
    showSuggestion(suffix, composer.editor, cursorPos);
  }

  function start() {
    if (intervalId) return;
    intervalId = setInterval(tick, 200);
    keydownHandler = (e) => {
      if (e.key === 'Tab' && currentSuggestion) {
        e.preventDefault();
        acceptSuggestion();
      }
    };
    document.addEventListener('keydown', keydownHandler, true);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler, true);
      keydownHandler = null;
    }
    hideSuggestion();
  }

  start();

  return function destroy() {
    stop();
  };
}
