class GCalEventService {
  constructor() {}

  getAllEvent(term) {
    if (Utility.isNullOrUndefined(gCal.calendar)) gCal.createCalendar();
    return gCal.calendar.getEvents(term.start, term.end);
  }

  /**
   * WARN syncToken発行のタイミング要注意
   */
  getEditedEvents() {
    const syncToken = gCal.getNextSyncToken();
    const option = syncToken
      ? {
          syncToken: syncToken,
        }
      : {};

    const gCalEvents = Calendar.Events.list(gCal.id, option);
    gCal.setNextSyncToken(gCalEvents);
    // TODO: { create: , delete: , update:  } の形にしたい
    return gCalEvents.items;
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
