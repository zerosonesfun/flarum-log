import app from 'flarum/admin/app';

export { default as extend } from './extend';

// Try translation keys in order; if translator returns the key (no catalog match), use fallback.
// Flarum may register extension locale under zerosonesfun-log or zerosonesfun-flarum-log depending on install.
function transOrFallback(keys, fallback) {
  const k = Array.isArray(keys) ? keys : [keys];
  for (const key of k) {
    const t = app.translator.trans(key);
    if (t !== key) return t;
  }
  return fallback;
}

const settingConfigs = [
  {
    setting: 'zerosonesfun-flarum-log.button_label',
    label: transOrFallback(
      ['zerosonesfun-log.admin.button_label_label', 'zerosonesfun-flarum-log.admin.button_label_label'],
      'Button label'
    ),
    help: transOrFallback(
      ['zerosonesfun-log.admin.button_label_help', 'zerosonesfun-flarum-log.admin.button_label_help'],
      'Text for the drinking button. Use {count} as placeholder for the number (e.g. "{count} Drinking").'
    ),
    type: 'text',
    placeholder: '{count} Drinking',
  },
  30,
  {
    setting: 'zerosonesfun-flarum-log.cooldown_minutes',
    label: transOrFallback(
      ['zerosonesfun-log.admin.cooldown_minutes_label', 'zerosonesfun-flarum-log.admin.cooldown_minutes_label'],
      'Cooldown (minutes)'
    ),
    help: transOrFallback(
      ['zerosonesfun-log.admin.cooldown_minutes_help', 'zerosonesfun-flarum-log.admin.cooldown_minutes_help'],
      'How many minutes before a user can click again (1–1440).'
    ),
    type: 'number',
    min: 1,
    max: 1440,
    default: 30,
  },
  20,
  {
    setting: 'zerosonesfun-flarum-log.log_tag_slug',
    label: transOrFallback(
      ['zerosonesfun-log.admin.log_tag_slug_label', 'zerosonesfun-flarum-log.admin.log_tag_slug_label'],
      'Log tag slug'
    ),
    help: transOrFallback(
      ['zerosonesfun-log.admin.log_tag_slug_help', 'zerosonesfun-flarum-log.admin.log_tag_slug_help'],
      'Tag slug to attach to new "Log - date" discussions when the Tags extension is enabled. Leave empty to skip auto-tagging.'
    ),
    type: 'text',
    placeholder: 'log',
  },
  10,
];

function registerSettings(extensionId) {
  app.extensionData
    .for(extensionId)
    .registerSetting(settingConfigs[0], settingConfigs[1])
    .registerSetting(settingConfigs[2], settingConfigs[3])
    .registerSetting(settingConfigs[4], settingConfigs[5]);
}

app.initializers.add('zerosonesfun-flarum-log', () => {
  // Package zerosonesfun/flarum-log → id is zerosonesfun-log (flarum- prefix stripped)
  registerSettings('zerosonesfun-log');
});
