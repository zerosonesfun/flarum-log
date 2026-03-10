/**
 * Flarum 2.0: Admin extender. app.extensionData is removed; register settings via Extend.Admin().
 */
import Extend from 'ext:flarum/common/extend';
import app from 'ext:flarum/admin/app';

export default [
  new Extend.Admin()
    .setting(
      () => ({
        setting: 'zerosonesfun-flarum-log.button_label',
        label: app.translator.trans('zerosonesfun-log.admin.button_label_label'),
        help: app.translator.trans('zerosonesfun-log.admin.button_label_help'),
        type: 'text',
        placeholder: '{count} Drinking',
      }),
      30
    )
    .setting(
      () => ({
        setting: 'zerosonesfun-flarum-log.cooldown_minutes',
        label: app.translator.trans('zerosonesfun-log.admin.cooldown_minutes_label'),
        help: app.translator.trans('zerosonesfun-log.admin.cooldown_minutes_help'),
        type: 'number',
        min: 1,
        max: 1440,
        default: 30,
      }),
      20
    )
    .setting(
      () => ({
        setting: 'zerosonesfun-flarum-log.log_tag_slug',
        label: app.translator.trans('zerosonesfun-log.admin.log_tag_slug_label'),
        help: app.translator.trans('zerosonesfun-log.admin.log_tag_slug_help'),
        type: 'text',
        placeholder: 'log',
      }),
      10
    )
    .setting(
      () => ({
        setting: 'zerosonesfun-flarum-log.variety_autocomplete_list',
        label: app.translator.trans('zerosonesfun-log.admin.variety_autocomplete_list_label'),
        help: app.translator.trans('zerosonesfun-log.admin.variety_autocomplete_list_help'),
        type: 'textarea',
        placeholder: 'strong, mild, light, dark',
      }),
      5
    ),
];
