class GCalEventService {
  constructor(calendarName) {
    this.gCal = this.getOrCreateGCal(calendarName);
  }

  getOrCreateGCal(calendarName) {
    let retgCal;

    const gCals = CalendarApp.getOwnedCalendarsByName(calendarName);
    if (gCals.length) {
      retgCal = gCals[0];
      console.info("Get GCal calendar: " + "exist target calendar name");
    } else {
      retgCal = this.createCalendar(calendarName);
      console.info("Create GCal calendar: " + "not exist target calendar name");
      console.warn("TODO: " + "notify setting");
    }
    return retgCal;
  }

  createCalendar(calendarName) {
    const option = {
      timeZone: 'Asia/Tokyo',
      color: CalendarApp.Color.PURPLE,
    }
    return CalendarApp.createCalendar(calendarName, option);
  }

  getGCal() {
    return this.gCal;
  }

  getEvent(term) {
    return this.gCal.getEvents(term.start, term.end);
  }

  isScheduleByGaroon(gCalEvents, garoonUniqueEventID) {
    return gCalEvents.find((e) => e.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === garoonUniqueEventID);
  }

  isLatestEvent(gCalEvent, garoonEvent) {
    const gCalTaggedTime = new Date(gCalEvent.getTag(TAG_GAROON_SYNC_DATETIME)).getTime();
    const garoonUpdatedTime = (new Date(garoonEvent.updatedAt)).getTime();
    return garoonUpdatedTime > gCalTaggedTime;
  }

  createEvent(garoonEventItem, garoonUniqueEventID) {
    let retGCalEvent;
    if (garoonEventItem.isAllDay) {
      retGCalEvent = this.gCal.createAllDayEvent(garoonEventItem.title, garoonEventItem.term.start, garoonEventItem.term.end, garoonEventItem.options);
    } else {
      retGCalEvent = this.gCal.createEvent(garoonEventItem.title, garoonEventItem.term.start, garoonEventItem.term.end, garoonEventItem.options);
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
