/**
 * Flarum 2.0: ext: imports; IndexPage.sidebarItems → IndexSidebar.items.
 */
import app from 'ext:flarum/forum/app';
import { extend as flarumExtend, override } from 'ext:flarum/common/extend';
import Discussion from 'ext:flarum/common/models/Discussion';
import IndexSidebar from 'ext:flarum/forum/components/IndexSidebar';
import HeaderSecondary from 'ext:flarum/forum/components/HeaderSecondary';
import UserCard from 'ext:flarum/forum/components/UserCard';
import UserPage from 'ext:flarum/forum/components/UserPage';
import Link from 'ext:flarum/common/components/Link';
import Button from 'ext:flarum/common/components/Button';
import DiscussionComposer from 'ext:flarum/forum/components/DiscussionComposer';
import DrinkLogsUserPage from './components/DrinkLogsUserPage';
import { attachVarietyAutocomplete } from './components/VarietyAutocomplete';

export const extend = [];

app.initializers.add('zerosonesfun-flarum-log', () => {
  // Register route at runtime (same pattern as custom-profile-page) so the component is a proper constructor.
  app.routes['zerosonesfun.drink-logs'] = {
    path: '/u/:username/drink-logs',
    component: DrinkLogsUserPage,
  };
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
  function isDiscussionComposer(textarea) {
    const composer = textarea.closest('.Composer');
    if (!composer) return false;
    return !!composer.querySelector('input[type="text"], .Composer-controls--title, input.Composer-controls-input');
  }
  function attachToComposerTextareas() {
    if (!app.forum || typeof app.forum.attribute !== 'function') return;
    const list = app.forum.attribute('drinkVarietyAutocompleteList');
    let arr = Array.isArray(list) ? list : (typeof list === 'string' ? list.split(',').map((s) => s.trim()).filter(Boolean) : []);
    if (arr.length === 0) return;
    document.querySelectorAll('.Composer textarea, .ComposerBody textarea, [class*="Composer"] textarea').forEach((textarea) => {
      if (textarea.tagName !== 'TEXTAREA' || textarea.getAttribute(VARIETY_ATTR)) return;
      if (!isDiscussionComposer(textarea)) return;
      textarea.setAttribute(VARIETY_ATTR, '1');
      attachVarietyAutocomplete(textarea, arr, {
        createSuggestionElement(suffix, onAccept) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'VarietyAutocomplete-suggestion';
          el.textContent = suffix;
          el.addEventListener('click', (e) => {
            e.preventDefault();
            onAccept();
          });
          return el;
        },
        getSuggestionContainer() {
          return textarea.parentNode;
        },
        onChange(newText) {
          if (app.composer.fields && typeof app.composer.fields.content === 'function') {
            app.composer.fields.content(newText);
          }
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        },
      });
    });
  }
  attachToComposerTextareas();
  const varietyObserver = new MutationObserver(() => attachToComposerTextareas());
  varietyObserver.observe(document.body, { childList: true, subtree: true });

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

  flarumExtend(UserPage.prototype, 'navItems', function (items) {
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
      <Link
        href={href}
        className={'DrinkLogNav-link' + (isActive ? ' DrinkLogNav-link--active' : '')}
      >
        <i className="fas fa-glass-whiskey DrinkLogNav-icon" />
        <span className="DrinkLogNav-label">
          {app.translator.trans('zerosonesfun-log.forum.drink_logs_nav_label')}
        </span>
        <span className="DrinkLogNav-count">{count}</span>
      </Link>,
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
    app.composer.load(DiscussionComposer, {
      user: app.session.user,
    });
    app.composer.show();
    if (app.composer.fields && typeof app.composer.fields.title === 'function') {
      app.composer.fields.title(title);
    }
    m.redraw();
  }
});
