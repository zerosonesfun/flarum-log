import app from 'flarum/admin/app';

// Extension Data API: id = composer name with slashes → dashes (zerosonesfun/flarum-log → zerosonesfun-flarum-log)
app.initializers.add('zerosonesfun-flarum-log', () => {
  app.extensionData
    .for('zerosonesfun-flarum-log')
    .registerSetting(
      {
        setting: 'zerosonesfun-flarum-log.button_label',
        label: app.translator.trans('zerosonesfun-flarum-log.admin.button_label_label'),
        help: app.translator.trans('zerosonesfun-flarum-log.admin.button_label_help'),
        type: 'text',
        placeholder: '{count} Drinking',
      },
      30
    )
    .registerSetting(
      {
        setting: 'zerosonesfun-flarum-log.cooldown_minutes',
        label: app.translator.trans('zerosonesfun-flarum-log.admin.cooldown_minutes_label'),
        help: app.translator.trans('zerosonesfun-flarum-log.admin.cooldown_minutes_help'),
        type: 'number',
        min: 1,
        max: 1440,
        default: 30,
      },
      20
    )
    .registerSetting(
      {
        setting: 'zerosonesfun-flarum-log.log_tag_slug',
        label: app.translator.trans('zerosonesfun-flarum-log.admin.log_tag_slug_label'),
        help: app.translator.trans('zerosonesfun-flarum-log.admin.log_tag_slug_help'),
        type: 'text',
        placeholder: 'log',
      },
      10
    );
});
