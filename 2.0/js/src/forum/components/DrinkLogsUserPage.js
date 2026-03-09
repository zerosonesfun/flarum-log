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
    return {
      ...params,
      filter: {
        ...(params.filter || {}),
        author: this.drinkLogUser.id(),
        tag: this.drinkLogTagId,
      },
    };
  }
}

export default class DrinkLogsUserPage extends UserPage {
  oninit(vnode) {
    super.oninit(vnode);
    this.drinkLogsState = null;
  }

  oncreate(vnode) {
    super.oncreate(vnode);
    if (this.user) {
      this.initDrinkLogsState();
    }
  }

  onupdate(vnode) {
    super.onupdate(vnode);
    if (this.user && !this.drinkLogsState) {
      this.initDrinkLogsState();
    }
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
