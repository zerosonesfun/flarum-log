import app from 'flarum/forum/app';
import UserPage from 'flarum/forum/components/UserPage';
import DiscussionList from 'flarum/forum/components/DiscussionList';
import DiscussionListState from 'flarum/forum/states/DiscussionListState';

/**
 * Shows discussions by this user that have the configured Log tag.
 * Mirrors core DiscussionsUserPage: pass filter + sort into DiscussionListState and call refresh().
 */
export default class DrinkLogsUserPage extends UserPage {
  oninit(vnode) {
    super.oninit(vnode);
    this.loadUser(m.route.param('username'));
  }

  show(user) {
    super.show(user);

    const tagSlug = (app.forum.attribute('drinkLogTagSlug') || '').trim();
    const tagId = app.forum.attribute('drinkLogTagId');
    const tagParam = tagSlug || tagId;
    if (tagParam == null || tagParam === '') {
      this.state = null;
      return;
    }

    // Same pattern as core DiscussionsUserPage: filter uses author: user.username()
    this.state = new DiscussionListState({
      filter: { author: user.username(), tag: tagParam },
      sort: 'newest',
    });
    this.state.refresh();
  }

  content() {
    if (!this.user) {
      return null;
    }
    const tagSlug = (app.forum.attribute('drinkLogTagSlug') || '').trim();
    const tagId = app.forum.attribute('drinkLogTagId');
    if ((tagId == null && !tagSlug) || !this.state) {
      return (
        <div className="DrinkLogsUserPage-empty">
          {app.translator.trans('zerosonesfun-log.forum.drink_logs_requires_tags')}
        </div>
      );
    }
    return (
      <div className="DrinkLogsUserPage">
        <DiscussionList state={this.state} />
      </div>
    );
  }
}
