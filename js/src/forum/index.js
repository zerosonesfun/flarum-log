import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import Button from 'flarum/common/components/Button';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';

app.initializers.add('zerosonesfun-flarum-log', () => {
  extend(IndexPage.prototype, 'sidebarItems', function (items) {
    if (!app.session.user) return items;

    const count = Number(app.forum.attribute('drinkCount')) || 0;
    const countFormatted = count.toLocaleString();
    const labelTemplate = app.forum.attribute('drinkButtonLabel') || '{count} Drinking';
    const label = String(labelTemplate).replace(/\{count\}/g, countFormatted);
    // Place button right after "Start a Discussion": remove nav, add ours, re-add nav with lower priority
    const navContent = items.has('nav') ? items.get('nav') : null;
    if (items.has('nav')) items.remove('nav');
    items.add(
      'drinkLog',
      <Button className="Button DrinkLogButton" onclick={this.drinkLogAction.bind(this)}>
        {label}
      </Button>,
      0
    );
    if (navContent !== null) items.add('nav', navContent, -10);
    return items;
  });

  IndexPage.prototype.drinkLogAction = function () {
    const cooldownMinutes = Number(app.forum.attribute('drinkCooldownMinutes')) || 30;
    const tagSlug = (app.forum.attribute('drinkLogTagSlug') || '').trim();
    app
      .request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/flarum-log',
      })
      .then((response) => {
        const data = response.data;
        app.forum.pushAttributes({ drinkCount: data.count });
        m.redraw();
        openLogComposerOrRedirect(tagSlug);
      })
      .catch((err) => {
        if (err.status === 429 && err.response && err.response.data) {
          app.forum.pushAttributes({ drinkCount: err.response.data.count });
          m.redraw();
          const message = app.translator.trans('zerosonesfun-log.forum.cooldown_message', {
            minutes: cooldownMinutes,
          });
          app.alerts.show({ type: 'error' }, message);
        }
        openLogComposerOrRedirect(tagSlug);
      });
  };

  function formatLogDate(d) {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const y = d.getFullYear();
    return (m < 10 ? '0' : '') + m + '/' + (day < 10 ? '0' : '') + day + '/' + y;
  }

  /**
   * If FoF Direct Links is enabled and we have a tag slug, use URL so Direct Links
   * opens the composer with title, tag, and body pre-filled. Otherwise open composer in-app
   * with title set (user can add tag manually).
   */
  function openLogComposerOrRedirect(tagSlug) {
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
    openLogComposer(title);
  }

  function openLogComposer(title) {
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
