class GCalEventService {
  constructor() {}

  findEventByUniqueEventId(gCalEvents, uniqueEventId) {
    let retEvent = null;

    const events = gCalEvents.filter((event) => {
      return event.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === uniqueEventId;
    });

    if (1 <= events.length) retEvent = events[0];
    return retEvent;
  }

  getByTerm(term) {
    return gCalDao.selectByTerm(term);
  }

  getEditedEvents() {
    let created = [];
    let deleted = [];
    let updated = [];

    const gCalEvents = gCalDao.getNotSyncedEvents();

    for (const gCalEvent of gCalEvents) {
      if (gCalEvent.status === 'cancelled') {
        deleted.push(gCalEvent);
        continue;
      }

      if (!gCalEvent.hasOwnProperty('extendedProperties')) {
        created.push(gCalEvent);
        // TODO 作成元のGCalにタグ付け
        continue;
      }

      const tagUniqueEventID =
        gCalEvent.extendedProperties.shared[TAG_GAROON_UNIQUE_EVENT_ID];

      // TODO 最終更新以降の編集がある場合: Garoonのイベント更新, GCalのタグ更新

      // TODO GCalから削除された: Garoonもイベント更新 (メンバーが自分のみの場合削除、2名以上の場合は脱退)

      // TODO Garoonの更新とGCalの更新、両方あったときはGaroonを優先したい
    }

    console.info('Created count: ' + created.length);
    console.info('Deleted count: ' + deleted.length);
    console.info('Updated count: ' + updated.length);

    return { create: created, delete: deleted, update: updated };
  }

  createEvent(garoonEventItem, garoonUniqueEventID) {
    let gCalEvent;
    if (garoonEventItem.isAllDay) {
      gCalEvent = gCal
        .getCalendar()
        .createAllDayEvent(
          garoonEventItem.title,
          garoonEventItem.term.start,
          garoonEventItem.term.end,
          garoonEventItem.options,
        );
    } else {
      gCalEvent = gCal
        .getCalendar()
        .createEvent(
          garoonEventItem.title,
          garoonEventItem.term.start,
          garoonEventItem.term.end,
          garoonEventItem.options,
        );
    }

    this.setTagToEvent(
      gCalEvent,
      garoonUniqueEventID,
      garoonEventItem.updatedAt,
    );
  }

  setTagToEvent(gCalEvent, garoonUniqueEventID, garoonUpdatedAt) {
    gCalEvent.setTag(TAG_GAROON_UNIQUE_EVENT_ID, garoonUniqueEventID);
    gCalEvent.setTag(TAG_GAROON_SYNC_DATETIME, garoonUpdatedAt);
  }
}
