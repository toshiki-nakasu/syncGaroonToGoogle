class GCalEventService {
  constructor() {}

  getEvent(term) {
    return gCal.calendar.getEvents(term.start, term.end);
  }

  isScheduleByGaroon(gCalEvents, garoonUniqueEventID) {
    return gCalEvents.find(
      (event) => event.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === garoonUniqueEventID,
    );
  }

  isLatestEvent(gCalEvent, garoonEvent) {
    const gCalTaggedTime = new Date(
      gCalEvent.getTag(TAG_GAROON_SYNC_DATETIME),
    ).getTime();
    const garoonUpdatedTime = new Date(garoonEvent.updatedAt).getTime();
    return garoonUpdatedTime > gCalTaggedTime;
  }

  createEvent(garoonEventItem, garoonUniqueEventID) {
    let retGCalEvent;
    if (garoonEventItem.isAllDay) {
      retGCalEvent = gCal.calendar.createAllDayEvent(
        garoonEventItem.title,
        garoonEventItem.term.start,
        garoonEventItem.term.end,
        garoonEventItem.options,
      );
    } else {
      retGCalEvent = gCal.calendar.createEvent(
        garoonEventItem.title,
        garoonEventItem.term.start,
        garoonEventItem.term.end,
        garoonEventItem.options,
      );
    }

    this.setTagToEvent(retGCalEvent, garoonUniqueEventID);
    return retGCalEvent;
  }

  setTagToEvent(gCalEvent, garoonUniqueEventID) {
    gCalEvent.setTag(TAG_GAROON_UNIQUE_EVENT_ID, garoonUniqueEventID);
    gCalEvent.setTag(TAG_GAROON_SYNC_DATETIME, new Date().toISOString());
    return gCalEvent;
  }
}
