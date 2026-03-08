import app from 'flarum/admin/app';

export { default as extend } from './extend';

// Use getters so label/help are translated when the settings component reads them (at render time),
// not at init when the extension locale may not be in the admin translator yet.
function makeSetting(setting, labelKey, helpKey, rest) {
  return {
    setting,
    get label() {
      return app.translator.trans(labelKey);
    },
    get help() {
      return app.translator.trans(helpKey);
    },
    ...rest,
  };
}

const settingConfigs = [
  makeSetting(
    'zerosonesfun-flarum-log.button_label',
    'zerosonesfun-log.admin.button_label_label',
    'zerosonesfun-log.admin.button_label_help',
    { type: 'text', placeholder: '{count} Drinking' }
  ),
  30,
  makeSetting(
    'zerosonesfun-flarum-log.cooldown_minutes',
    'zerosonesfun-log.admin.cooldown_minutes_label',
    'zerosonesfun-log.admin.cooldown_minutes_help',
    { type: 'number', min: 1, max: 1440, default: 30 }
  ),
  20,
  makeSetting(
    'zerosonesfun-flarum-log.log_tag_slug',
    'zerosonesfun-log.admin.log_tag_slug_label',
    'zerosonesfun-log.admin.log_tag_slug_help',
    { type: 'text', placeholder: 'log' }
  ),
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
  registerSettings('zerosonesfun-log');
});
