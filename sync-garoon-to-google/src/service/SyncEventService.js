class SyncEventService {
  constructor() {}

  syncGaroonToGCal(garoonEditedEvents, gCalAllEvents) {
    console.info('Sync Garoon To GCal: ' + 'START');
    for (const garoonEvent of garoonEditedEvents.create) {
      gCalDao.createEvent(garoonEvent);
    }

    for (const garoonEvent of garoonEditedEvents.delete) {
      gCalDao.deleteEvent(garoonEvent, gCalAllEvents);
    }

    for (const eventArray of garoonEditedEvents.update) {
      gCalDao.updateEvent(eventArray);
    }

    console.info('Sync Garoon To GCal: ' + 'END');
  }

  syncGCalToGaroon(gCalEditedEvents, garoonAllEvents) {
    console.info('Sync GCal To Garoon: ' + 'START');

    let garoonEvent;
    for (const gCalEvent of gCalEditedEvents.create) {
      garoonEvent = garoonEventService.createEvent(gCalEvent);

      // TODO 差分取得結果のオブジェクトのため、setTagが使えない
      // extendedPropertiesにセットしてもオブジェクトにレコードを追加するだけで、GCalには反映されない想定
      //   if (null === garoonEvent) continue;
      //   gCalEventService.setTagToEvent(
      //     gCalEvent,
      //     garoonEvent.uniqueId,
      //     garoonEvent.updatedAt,
      //   );
    }

    for (const gCalEvent of gCalEditedEvents.delete) {
      // garoonDao.deleteEvent(gCalEvent, garoonAllEvents);
      // TODO GCalから削除された: Garoonもイベント更新 (メンバーが自分のみの場合削除、2名以上の場合は脱退)
    }

    for (const gCalEvent of gCalEditedEvents.update) {
      // garoonDao.updateEvent(gCalEvent);
      // TODO 最終更新以降の編集がある場合: Garoonのイベント更新, GCalのタグ更新
      // TODO Garoonの更新とGCalの更新、両方あったときはGaroonを優先したい (競合対策)
      // TODO 新規作成・更新・削除が同時に行われたとき、どう返ってくる？
    }

    console.info('Sync GCal To Garoon: ' + 'END');
  }
}
