import { SYNC_ALARM } from '../config/Settings.js';

/** 永続化されたON/OFFと間隔をChromeのアラームへ反映する。 */
export class AutoSyncScheduler {
  constructor(alarms) {
    this.alarms = alarms;
  }

  /** 同じ間隔のアラームは作り直さず、次回の実行時刻を維持する。 */
  async reconcile(settings) {
    const alarm = await this.alarms.get(SYNC_ALARM);
    if (!settings.autoSync) {
      if (alarm) await this.alarms.clear(SYNC_ALARM);
      return;
    }
    if (!alarm || alarm.periodInMinutes !== settings.syncIntervalMinutes) {
      await this.alarms.create(SYNC_ALARM, {
        periodInMinutes: settings.syncIntervalMinutes,
      });
    }
  }
}
