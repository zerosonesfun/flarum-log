/**
 * Flarum 2.0: ext: imports for Routes.
 */
import Routes from 'ext:flarum/common/extend/Routes';
import DrinkLogsUserPage from './components/DrinkLogsUserPage';

export default [new Routes().add('zerosonesfun.drink-logs', '/u/:username/drink-logs', DrinkLogsUserPage)];
