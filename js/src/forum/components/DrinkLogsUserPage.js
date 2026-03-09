import app from 'flarum/forum/app';
import UserPage from 'flarum/forum/components/UserPage';
import DiscussionList from 'flarum/forum/components/DiscussionList';
import DiscussionListState from 'flarum/forum/states/DiscussionListState';

/**
 * List state that filters discussions by author and log tag.
 */
class DrinkLogsListState extends DiscussionListState {
  constructor(user, tagId) {
    super();
    this.drinkLogUser = user;
    this.drinkLogTagId = tagId;
  }

  getParams() {
    const params = super.getParams();
    if (!this.drinkLogUser || this.drinkLogTagId == null) {
      return params;
    }
    // Flarum's discussion list API expects author by slug and tag by id (or slug depending on extension)
    return {
      ...params,
      filter: {
        ...(params.filter || {}),
        author: this.drinkLogUser.slug(),
        tag: this.drinkLogTagId,
      },
    };
  }
}

export default class DrinkLogsUserPage extends UserPage {
  oninit(vnode) {
    super.oninit(vnode);
    this.drinkLogsState = null;
    // Load user from route so this.user is set (required for UserPage; custom route doesn't do this automatically)
    this.loadUser(m.route.param('username'));
  }

  show(user) {
    super.show(user);
    this.initDrinkLogsState();
  }

  initDrinkLogsState() {
    const tagId = app.forum.attribute('drinkLogTagId');
    if (tagId != null && this.user) {
      this.drinkLogsState = new DrinkLogsListState(this.user, tagId);
      this.drinkLogsState.loadPage(1);
    }
  }

  content() {
    if (!this.user) {
      return null;
    }
    const tagId = app.forum.attribute('drinkLogTagId');
    if (tagId == null) {
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
