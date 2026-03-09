import Routes from 'flarum/common/extend/Routes';
import DrinkLogsUserPage from './components/DrinkLogsUserPage';

export default [new Routes().add('zerosonesfun.drink-logs', '/u/:username/drink-logs', <DrinkLogsUserPage />)];
