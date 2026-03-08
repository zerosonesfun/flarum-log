import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import UserCard from 'flarum/forum/components/UserCard';
import Button from 'flarum/common/components/Button';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';

app.initializers.add('zerosonesfun-flarum-log', () => {
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

  function handleDrinkLogClick(indexPage) {
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
        openLogComposerOrRedirect(tagSlug, indexPage);
      })
      .catch((err) => {
        if (err.status === 429 && err.response && err.response.data) {
          app.forum.pushAttributes({ drinkCount: err.response.data.count });
          m.redraw();
        }
        openLogComposerOrRedirect(tagSlug, indexPage);
      });
  }

  extend(IndexPage.prototype, 'sidebarItems', function (items) {
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

  extend(HeaderSecondary.prototype, 'items', function (items) {
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

  extend(UserCard.prototype, 'infoItems', function (items) {
    const user = this.attrs.user;
    const total = Number(user.attribute('drinkLogTotal')) || 0;
    const countLabel = abbreviateNumber(total);
    const key = total === 1 ? 'zerosonesfun-log.forum.user_card_drink' : 'zerosonesfun-log.forum.user_card_drinks';
    const attrs = total === 1 ? {} : { count: countLabel };
    items.add('drinkLogTotal', app.translator.trans(key, attrs), 85);
    return items;
  });

  function formatLogDate(d) {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const y = d.getFullYear();
    return (m < 10 ? '0' : '') + m + '/' + (day < 10 ? '0' : '') + day + '/' + y;
  }

  /**
   * If FoF Direct Links is enabled and we have a tag slug, use URL so Direct Links
   * opens the composer with title, tag, and body pre-filled. Otherwise open composer in-app
   * using the same flow as "Start a Discussion" so mobile minimize/discard (double-X) works.
   */
  function openLogComposerOrRedirect(tagSlug, indexPage) {
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
    openLogComposer(title, indexPage);
  }

  /**
   * Open composer the same way as "Start a Discussion" (newDiscussionAction) so that
   * on mobile the first X minimizes and the second X properly discards the draft.
   * Then set the title after the composer is shown.
   */
  function openLogComposer(title, indexPage) {
    if (indexPage && typeof indexPage.newDiscussionAction === 'function') {
      indexPage
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
    // Fallback if IndexPage context not available
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
