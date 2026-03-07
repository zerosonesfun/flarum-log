import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import Button from 'flarum/common/components/Button';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';
import Stream from 'flarum/common/utils/Stream';

app.initializers.add('zerosonesfun-flarum-log', () => {
  extend(IndexPage.prototype, 'sidebarItems', function (items) {
    if (!app.session.user) return items;

    const count = Number(app.forum.attribute('drinkCount')) || 0;
    const labelTemplate = app.forum.attribute('drinkButtonLabel') || '{count} Drinking';
    const label = String(labelTemplate).replace(/\{count\}/g, count);
    items.add(
      'drinkLog',
      <Button className="Button DrinkLogButton" onclick={this.drinkLogAction.bind(this)}>
        {label}
      </Button>,
      -10
    );
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
      initialTitle: title,
    });
    app.composer.show();
    m.redraw();
  }

  extend(DiscussionComposer.prototype, 'oninit', function (vnode) {
    const attrs = vnode.attrs;
    if (attrs && attrs.initialTitle) {
      if (this.composer.fields.title) {
        this.composer.fields.title(attrs.initialTitle);
      } else {
        this.composer.fields.title = Stream(attrs.initialTitle);
      }
    }
  });
});
