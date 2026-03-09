/**
 * Flarum 2.0: ext: imports for UserPage, DiscussionList, DiscussionListState.
 */
import app from 'ext:flarum/forum/app';
import UserPage from 'ext:flarum/forum/components/UserPage';
import DiscussionList from 'ext:flarum/forum/components/DiscussionList';
import DiscussionListState from 'ext:flarum/forum/states/DiscussionListState';

/**
 * List state that filters discussions by author and log tag.
 */
class DrinkLogsListState extends DiscussionListState {
  constructor(user, tagId, tagSlug) {
    super();
    this.drinkLogUser = user;
    this.drinkLogTagId = tagId;
    this.drinkLogTagSlug = tagSlug || '';
  }

  getParams() {
    const params = super.getParams();
    if (!this.drinkLogUser || (this.drinkLogTagId == null && !this.drinkLogTagSlug)) {
      return params;
    }
    // Flarum: author = user id; tag = slug (flarum/tags typically expects slug) or id
    const tagFilter = this.drinkLogTagSlug || this.drinkLogTagId;
    return {
      ...params,
      filter: {
        ...(params.filter || {}),
        author: this.drinkLogUser.id(),
        tag: tagFilter,
      },
    };
  }
}

export default class DrinkLogsUserPage extends UserPage {
  oninit(vnode) {
    super.oninit(vnode);
    this.drinkLogsState = null;
    this.loadUser(m.route.param('username'));
  }

  show(user) {
    super.show(user);
    this.initDrinkLogsState();
  }

  initDrinkLogsState() {
    const tagId = app.forum.attribute('drinkLogTagId');
    const tagSlug = (app.forum.attribute('drinkLogTagSlug') || '').trim();
    if ((tagId != null || tagSlug) && this.user) {
      this.drinkLogsState = new DrinkLogsListState(this.user, tagId, tagSlug);
      this.drinkLogsState.loadPage(1);
    }
  }

  content() {
    if (!this.user) {
      return null;
    }
    const tagId = app.forum.attribute('drinkLogTagId');
    const tagSlug = (app.forum.attribute('drinkLogTagSlug') || '').trim();
    if (tagId == null && !tagSlug) {
      return (
        <div className="DrinkLogsUserPage-empty">
          {app.translator.trans('zerosonesfun-log.forum.drink_logs_requires_tags')}
        </div>
      );
    }
    if (!this.drinkLogsState) {
      return null;
    }
    return (
      <div className="DrinkLogsUserPage">
        <DiscussionList state={this.drinkLogsState} />
      </div>
    );
  }
}
