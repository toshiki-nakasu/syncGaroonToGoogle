class GaroonSyncService {
  constructor() {}

  syncFromGoogle() {
    console.info('Sync GCal Event: ' + 'START');
    const gCalEvents = gCal.onCalendarEdit(syncTargetTerm);

    console.info('Sync GCal Event: ' + 'END');
  }

  createOrUpdateEvent(gCalEvents, garoonEvents) {
    let tagUniqueEventID;
    for (const gCalEvent of gCalEvents) {
      // Garoonから同期されたスケジュールはskip
      tagUniqueEventID = gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID);
      if (tagUniqueEventID) {
        continue;
      }

      // Garoonでスケジュールを作成
      // 作成したスケジュールのuniqueIdを取得
      // 作成元のGCalスケジュールにタグ付け

      // 削除判定ができないので、hookを活用したい
    }
  }

  deleteEvent() {}
}
