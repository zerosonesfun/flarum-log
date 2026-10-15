/**
 * Flarum 2.0: core imports use flarum/… (ext: is only for other extensions).
 * IndexPage.sidebarItems → IndexSidebar.items.
 * UserPage is code-split, so DrinkLogsUserPage is loaded only after that chunk.
 */
import app from 'flarum/forum/app';
import { extend as flarumExtend, override } from 'flarum/common/extend';
import Discussion from 'flarum/common/models/Discussion';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import UserCard from 'flarum/forum/components/UserCard';
import LinkButton from 'flarum/common/components/LinkButton';
import Button from 'flarum/common/components/Button';
import UserPageResolver from 'flarum/forum/resolvers/UserPageResolver';
import { attachVarietyAutocomplete } from './components/VarietyAutocomplete';
import { attachLocationFill } from './components/LocationFill';

export const extend = [];

app.initializers.add('zerosonesfun-flarum-log', () => {
  // UserPage, DiscussionList, and DiscussionListState live in a split chunk.
  // Load that chunk before this page module evaluates `extends UserPage`.
  const drinkLogsRoute = {
    path: '/u/:username/drink-logs',
    component: () =>
      Promise.all([
        import('flarum/forum/components/UserPage'),
        import('flarum/forum/components/DiscussionList'),
        import('flarum/forum/states/DiscussionListState'),
      ]).then(() => import('./components/DrinkLogsUserPage')),
  };
  if (typeof UserPageResolver === 'function') {
    drinkLogsRoute.resolverClass = UserPageResolver;
  }
  app.routes['zerosonesfun.drink-logs'] = drinkLogsRoute;
  function abbreviateNumber(n) {
    const num = Number(n) || 0;
    if (num >= 1e6) {
      const v = num / 1e6;
      return (v % 1 === 0 ? v : v.toFixed(1)) + 'M';
    }
    if (num >= 1e3) {
      const v = num / 1e3;
      return (v % 1 === 0 ? v : v.toFixed(1)) + 'k';
    }
    return String(num);
  }

  function getDrinkLogLabel() {
    const count = Number(app.forum.attribute('drinkCount')) || 0;
    const countFormatted = count.toLocaleString();
    const labelTemplate = app.forum.attribute('drinkButtonLabel') || '{count} Drinking';
    return String(labelTemplate).replace(/\{count\}/g, countFormatted);
  }

  function handleDrinkLogClick(indexSidebar) {
    const tagSlug = (app.forum.attribute('drinkLogTagSlug') || '').trim();
    app
      .request(
        {
          method: 'POST',
          url: app.forum.attribute('apiUrl') + '/flarum-log',
        },
        { errorMessage: false }
      )
      .then((response) => {
        const data = response.data;
        app.forum.pushAttributes({ drinkCount: data.count });
        if (app.session.user && data.userTotal !== undefined) {
          app.session.user.pushAttributes({ drinkLogTotal: data.userTotal });
        }
        m.redraw();
        openLogComposerOrRedirect(tagSlug, indexSidebar);
      })
      .catch((err) => {
        if (err.status === 429 && err.response && err.response.data) {
          app.forum.pushAttributes({ drinkCount: err.response.data.count });
          m.redraw();
        }
        openLogComposerOrRedirect(tagSlug, indexSidebar);
      });
  }

  const VARIETY_ATTR = 'data-drink-log-variety-attached';
  const LOCATION_ATTR = 'data-drink-log-location-attached';
  function isComposerTextarea(textarea) {
    if (!textarea || textarea.tagName !== 'TEXTAREA') return false;
    const composer = textarea.closest('.Composer, .ComposerBody, [class*="Composer"]');
    return !!composer;
  }
  function composerOnChange(textarea, newText) {
    if (app.composer.fields && typeof app.composer.fields.content === 'function') {
      app.composer.fields.content(newText);
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function attachToComposerTextareas() {
    if (!app.forum || typeof app.forum.attribute !== 'function') return;
    const list = app.forum.attribute('drinkVarietyAutocompleteList');
    let arr = Array.isArray(list) ? list : (typeof list === 'string' ? list.split(',').map((s) => s.trim()).filter(Boolean) : []);
    const textareas = document.querySelectorAll('.Composer textarea, .ComposerBody textarea, [class*="Composer"] textarea');
    if (arr.length > 0) {
      textareas.forEach((textarea) => {
        if (!isComposerTextarea(textarea) || textarea.getAttribute(VARIETY_ATTR)) return;
        textarea.setAttribute(VARIETY_ATTR, '1');
        attachVarietyAutocomplete(textarea, arr, { onChange: (newText) => composerOnChange(textarea, newText) });
      });
    }
    textareas.forEach((textarea) => {
      if (!isComposerTextarea(textarea) || textarea.getAttribute(LOCATION_ATTR)) return;
      textarea.setAttribute(LOCATION_ATTR, '1');
      attachLocationFill(textarea, { onChange: (newText) => composerOnChange(textarea, newText) });
    });
  }
  attachToComposerTextareas();
  const varietyObserver = new MutationObserver(() => attachToComposerTextareas());
  varietyObserver.observe(document.body, { childList: true, subtree: true });

  // When composer has log tag and user taps .item-close, refresh page. Left in place for later troubleshooting (e.g. URL-param composer).
  const CLOSE_BOUND_ATTR = 'data-drink-log-close-bound';

  function composerHasLogTag() {
    const slug = String(app.forum.attribute('drinkLogTagSlug') || 'log').trim().toLowerCase();
    if (!slug) return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('primary_tag') && String(params.get('primary_tag')).trim().toLowerCase() === slug) return true;
    } catch (_) {}
    const composer = document.querySelector('.Composer');
    if (!composer) return false;
    const withSlug = composer.querySelectorAll('[data-slug]');
    return Array.prototype.some.call(withSlug, (el) => String(el.getAttribute('data-slug') || '').trim().toLowerCase() === slug);
  }

  function shouldRefreshOnClose() {
    if (!app.composer) return false;
    const composerEl = document.querySelector('.Composer');
    if (!composerEl) return false;
    const expanded = typeof app.composer.visible === 'function' ? app.composer.visible() : !!app.composer.visible;
    const minimized = composerEl.classList.contains('minimized');
    if (!expanded && !minimized) return false;
    return composerHasLogTag();
  }

  function onCloseClick() {
    if (!shouldRefreshOnClose()) return;
    window.location.reload();
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.item-close')) return;
    onCloseClick();
  }, true);

  function bindCloseButton(el) {
    if (el.getAttribute(CLOSE_BOUND_ATTR)) return;
    el.setAttribute(CLOSE_BOUND_ATTR, '1');
    el.addEventListener('click', onCloseClick, true);
  }

  const closeObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches('.item-close')) bindCloseButton(node);
        const list = node.querySelectorAll && node.querySelectorAll('.item-close');
        if (list) list.forEach(bindCloseButton);
      }
    }
  });
  closeObserver.observe(document.body, { childList: true, subtree: true });
  document.querySelectorAll('.item-close').forEach(bindCloseButton);

  // Flarum 2.0: IndexPage.prototype.sidebarItems → IndexSidebar.prototype.items
  flarumExtend(IndexSidebar.prototype, 'items', function (items) {
    if (!app.session.user) return items;

    const label = getDrinkLogLabel();
    const navContent = items.has('nav') ? items.get('nav') : null;
    if (items.has('nav')) items.remove('nav');
    items.add(
      'drinkLog',
      <Button className="Button DrinkLogButton" onclick={() => handleDrinkLogClick(this)}>
        {label}
      </Button>,
      0
    );
    if (navContent !== null) items.add('nav', navContent, -10);
    return items;
  });

  flarumExtend(HeaderSecondary.prototype, 'items', function (items) {
    if (!app.session.user) return items;

    const label = getDrinkLogLabel();
    items.add(
      'drinkLog',
      <Button className="Button DrinkLogButton DrinkLogButton--drawer" onclick={() => handleDrinkLogClick(null)}>
        {label}
      </Button>,
      29
    );
    return items;
  });

  flarumExtend(UserCard.prototype, 'infoItems', function (items) {
    const user = this.attrs.user;
    const total = Number(user.attribute('drinkLogTotal')) || 0;
    const countLabel = abbreviateNumber(total);
    const key = total === 1 ? 'zerosonesfun-log.forum.user_card_drink' : 'zerosonesfun-log.forum.user_card_drinks';
    const attrs = total === 1 ? {} : { count: countLabel };
    items.add('drinkLogTotal', app.translator.trans(key, attrs), 85);
    return items;
  });

  flarumExtend('flarum/forum/components/UserPage', 'navItems', function (items) {
    const user = this.user;
    if (!user) return items;
    const count = Number(user.attribute('drinkLogDiscussionsCount')) || 0;
    const tagId = app.forum.attribute('drinkLogTagId');
    if (tagId == null) return items;
    const href = app.route('zerosonesfun.drink-logs', { username: user.slug() });
    const path = typeof m.route.get === 'function' ? (m.route.get() || '') : '';
    const isActive = (app.current.get && app.current.get('routeName') === 'zerosonesfun.drink-logs') || path.indexOf('/drink-logs') !== -1;
    items.add(
      'drinkLogs',
      <LinkButton href={href} icon="fas fa-glass-whiskey" active={isActive}>
        {app.translator.trans('zerosonesfun-log.forum.drink_logs_nav_label')} <span className="Button-badge">{count}</span>
      </LinkButton>,
      75
    );
    return items;
  });

  function discussionHadLogTag(discussion) {
    const tagId = app.forum.attribute('drinkLogTagId');
    if (tagId == null) return false;
    const tags = discussion.tags && discussion.tags();
    if (Array.isArray(tags)) return tags.some((t) => t && String(t.id()) === String(tagId));
    const rel = discussion.data.relationships && discussion.data.relationships.tags;
    const data = rel && rel.data;
    if (Array.isArray(data)) return data.some((r) => r && String(r.id) === String(tagId));
    return false;
  }

  function isCurrentUserAuthor(discussion) {
    return app.session.user && discussion.user() && discussion.user().id() === app.session.user.id();
  }

  function decrementDrinkTotalFromFrontend() {
    app
      .request({ method: 'POST', url: app.forum.attribute('apiUrl') + '/flarum-log/decrement-total' })
      .then((res) => {
        if (res.data && res.data.newTotal !== undefined && app.session.user) {
          app.session.user.pushAttributes({ drinkLogTotal: res.data.newTotal });
          m.redraw();
        }
      })
      .catch(() => {});
  }

  override(Discussion.prototype, 'delete', function (original, body, options) {
    const discussion = this;
    const hadLogTag = discussionHadLogTag(discussion);
    const isAuthor = isCurrentUserAuthor(discussion);
    return original.call(this, body, options).then(
      function () {
        if (hadLogTag && isAuthor) decrementDrinkTotalFromFrontend();
      },
      function (err) {
        throw err;
      }
    );
  });

  override(Discussion.prototype, 'save', function (original, attributes, options) {
    const discussion = this;
    const isHiding = attributes && (attributes.isHidden === true || attributes.isHidden === 'true');
    const hadLogTag = isHiding && discussionHadLogTag(discussion);
    const isAuthor = isHiding && isCurrentUserAuthor(discussion);
    return original.call(this, attributes, options).then(
      function (saved) {
        if (hadLogTag && isAuthor) decrementDrinkTotalFromFrontend();
        return saved;
      },
      function (err) {
        throw err;
      }
    );
  });

  function formatLogDate(d) {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const y = d.getFullYear();
    return (m < 10 ? '0' : '') + m + '/' + (day < 10 ? '0' : '') + day + '/' + y;
  }

  function openLogComposerOrRedirect(tagSlug, indexSidebar) {
    const title = 'Log - ' + formatLogDate(new Date());
    const directLinksEnabled = !!app.forum.attribute('drinkDirectLinksEnabled');
    if (directLinksEnabled && tagSlug) {
      const baseUrl = (app.forum.attribute('baseUrl') || '').replace(/\/$/, '');
      const content = '`Date` \n`Time` \n`Location` \n`Amount` \n`Variety` ';
      const q = [
        'title=' + encodeURIComponent(title),
        'primary_tag=' + encodeURIComponent(tagSlug),
        'content=' + encodeURIComponent(content),
      ].join('&');
      window.location.href = baseUrl + '/composer?' + q;
      return;
    }
    openLogComposer(title, indexSidebar);
  }

  function openLogComposer(title, indexSidebar) {
    // 2.0: newDiscussionAction may be on IndexSidebar or still on a page context
    const page = indexSidebar?.attrs?.state?.getPage?.() ?? null;
    if (page && typeof page.newDiscussionAction === 'function') {
      page
        .newDiscussionAction()
        .then(() => {
          if (app.composer.fields && typeof app.composer.fields.title === 'function') {
            app.composer.fields.title(title);
          }
          m.redraw();
        })
        .catch(() => {});
      return;
    }
    app.composer
      .load(() => import('flarum/forum/components/DiscussionComposer'), {
        user: app.session.user,
      })
      .then(() => {
        app.composer.show();
        if (app.composer.fields && typeof app.composer.fields.title === 'function') {
          app.composer.fields.title(title);
        }
        m.redraw();
      })
      .catch(() => {});
  }
});
