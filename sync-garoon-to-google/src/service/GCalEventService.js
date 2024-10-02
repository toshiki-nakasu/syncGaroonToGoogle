class GCalEventService {
  constructor() {}

  findEventByUniqueEventId(gCalEvents, uniqueEventId) {
    let retEvent = null;

    const eventMap = gCalEvents.map((event) => {
      const tagUniqueEventID = event.getTag(TAG_GAROON_UNIQUE_EVENT_ID);
      if (tagUniqueEventID === uniqueEventId) return event;
    });

    if (!Utility.isNullOrUndefined(eventMap.length)) retEvent = eventMap[0];
    return retEvent;
  }

  getByTerm(term) {
    if (Utility.isNullOrUndefined(gCal.calendar)) gCalDao.createCalendar();
    return gCalDao.selectByTerm(term);
  }

  /**
   * WARN syncToken発行のタイミング要注意
   */
  getEditedEvents() {
    let created = [];
    let deleted = [];
    let updated = [];

    const syncToken = gCal.getNextSyncToken();
    const option = syncToken
      ? {
          syncToken: syncToken,
        }
      : {};

    const gCalEvents = Calendar.Events.list(gCal.id, option).items;
    // FIXME gCal.setNextSyncToken(gCalEvents);

    // TODO: { create: , delete: , update:  } の形にしたい
    // TODO uniqueIdなし: Garoonに新規作成, 作成元のGCalにタグ付け
    // TODO uniqueIdあり、かつ最終更新以降の編集がない場合: skip
    // TODO uniqueIdあり、かつ最終更新以降の編集がある場合: Garoonのイベント更新, GCalのタグ更新
    // TODO uniqueIdあり、かつGCalから削除された: Garoonもイベント更新 (メンバーが自分のみの場合削除、2名以上の場合は脱退)

    // for (const gCalEvent of gCalEvents) {
    //   const tagUniqueEventID = gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID);
    // }

    console.log(gCalEvents);

    return { create: created, delete: deleted, update: updated };
  }

  createEvent(garoonEventItem, garoonUniqueEventID) {
    let gCalEvent;
    if (garoonEventItem.isAllDay) {
      gCalEvent = gCal.calendar.createAllDayEvent(
        garoonEventItem.title,
        garoonEventItem.term.start,
        garoonEventItem.term.end,
        garoonEventItem.options,
      );
    } else {
      gCalEvent = gCal.calendar.createEvent(
        garoonEventItem.title,
        garoonEventItem.term.start,
        garoonEventItem.term.end,
        garoonEventItem.options,
      );
    }

    this.setTagToEvent(gCalEvent, garoonUniqueEventID);
  }

  setTagToEvent(gCalEvent, garoonUniqueEventID) {
    gCalEvent.setTag(TAG_GAROON_UNIQUE_EVENT_ID, garoonUniqueEventID);
    gCalEvent.setTag(TAG_GAROON_SYNC_DATETIME, new Date().toISOString());
  }
}
