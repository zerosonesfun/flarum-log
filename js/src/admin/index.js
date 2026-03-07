import app from 'flarum/admin/app';

export { default as extend } from './extend';

// Use extension id for translation keys so admin locale (zerosonesfun-log) resolves
const settingConfigs = [
  {
    setting: 'zerosonesfun-flarum-log.button_label',
    label: app.translator.trans('zerosonesfun-log.admin.button_label_label'),
    help: app.translator.trans('zerosonesfun-log.admin.button_label_help'),
    type: 'text',
    placeholder: '{count} Drinking',
  },
  30,
  {
    setting: 'zerosonesfun-flarum-log.cooldown_minutes',
    label: app.translator.trans('zerosonesfun-log.admin.cooldown_minutes_label'),
    help: app.translator.trans('zerosonesfun-log.admin.cooldown_minutes_help'),
    type: 'number',
    min: 1,
    max: 1440,
    default: 30,
  },
  20,
  {
    setting: 'zerosonesfun-flarum-log.log_tag_slug',
    label: app.translator.trans('zerosonesfun-log.admin.log_tag_slug_label'),
    help: app.translator.trans('zerosonesfun-log.admin.log_tag_slug_help'),
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
