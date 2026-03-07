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
    app
      .request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/flarum-log',
      })
      .then((response) => {
        const data = response.data;
        app.forum.pushAttributes({ drinkCount: data.count });
        m.redraw();
        openLogComposer();
      })
      .catch((err) => {
        if (err.status === 429 && err.response && err.response.data) {
          app.forum.pushAttributes({ drinkCount: err.response.data.count });
          m.redraw();
        }
        openLogComposer();
      });
  };

  function formatLogDate(d) {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const y = d.getFullYear();
    return (m < 10 ? '0' : '') + m + '/' + (day < 10 ? '0' : '') + day + '/' + y;
  }

  function openLogComposer() {
    const title = 'Log - ' + formatLogDate(new Date());
    app.composer.load(DiscussionComposer, {
      user: app.session.user,
    });
    app.composer.show();
    if (app.composer.fields) {
      if (typeof app.composer.fields.title === 'function') {
        app.composer.fields.title(title);
      }
      // Set Log tag from settings (like FoF Direct Links primary_tag)
      const tagSlug = app.forum.attribute('drinkLogTagSlug');
      if (tagSlug && app.store.has('tags')) {
        const tag = app.store.getBy('tags', 'slug', tagSlug);
        if (tag) {
          const parent = tag.parent();
          app.composer.fields.tags = parent ? [parent, tag] : [tag];
        }
      }
    }
    m.redraw();
  }
});
