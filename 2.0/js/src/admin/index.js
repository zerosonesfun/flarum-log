/**
 * Flarum 2.0: Admin entry. Settings are registered via extend.js (Extend.Admin().setting()).
 */
import app from 'ext:flarum/admin/app';

export { default as extend } from './extend';

app.initializers.add('zerosonesfun-flarum-log', () => {
  // No-op: settings are registered via Extend.Admin() in extend.js
});
