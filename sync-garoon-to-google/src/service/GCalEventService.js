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

  getEditedEvents(garoonEvents) {
    let created = [];
    let deleted = [];
    let updated = [];

    const gCalEvents = gCalDao.getNotSyncedEvents();

    let tagUniqueEventID;
    let garoonEvent;
    for (const gCalEvent of gCalEvents) {
      if (gCalEvent.status === 'cancelled') {
        deleted.push(gCalEvent);
        // TODO GCalから削除された: Garoonもイベント更新 (メンバーが自分のみの場合削除、2名以上の場合は脱退)
        continue;
      }

      if (!gCalEvent.hasOwnProperty('extendedProperties')) {
        created.push(gCalEvent);
        // TODO 作成元のGCalにタグ付け
        continue;
      }

      // TODO 最終更新以降の編集がある場合: Garoonのイベント更新, GCalのタグ更新
      // TODO Garoonの更新とGCalの更新、両方あったときはGaroonを優先したい (競合対策)
      // TODO 新規作成・更新・削除が同時に行われたとき、どう返ってくる？
      tagUniqueEventID =
        gCalEvent.extendedProperties.shared[TAG_GAROON_UNIQUE_EVENT_ID];
      garoonEvent = garoonEventService.findEventByUniqueEventId(
        garoonEvents,
        tagUniqueEventID,
      );
      updated.push([garoonEvent, gCalEvent]);
    }

    console.info(
      `GCal Event:\n\tCreated count: ${created.length}\n\tDeleted count: ${deleted.length}\n\tUpdated count: ${updated.length}`,
    );

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
