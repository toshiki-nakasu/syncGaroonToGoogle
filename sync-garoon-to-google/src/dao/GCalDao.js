class GCalDao {
  constructor() {}

  selectByTerm(term) {
    return gCal.getCalendar().getEvents(term.start, term.end);
  }

  getNotSyncedEvents() {
    const syncToken = gCal.getNextSyncToken();
    const option = syncToken
      ? {
          syncToken: syncToken,
        }
      : {};

    try {
      const retEvents = Calendar.Events.list(gCal.getId(), option);
      gCal.setNextSyncToken(retEvents.nextSyncToken);
      return retEvents.items;
    } catch (err) {
      if (410 === err.details.code) {
        gCal.delNextSyncToken();
      }
      throw new Error(err);
    }
  }

  createCalendar(name) {
    const option = {
      timeZone: properties.getProperty('TimeZone'),
      color: CalendarApp.Color.PURPLE,
    };
    const retCalendar = CalendarApp.createCalendar(name, option);
    console.info('Createing GCal calendar...');
    Utilities.sleep(API_COOL_TIME * 5);
    console.warn('Created GCal calendar: ' + 'please notify, color setting');
    return retCalendar;
  }

  create(garoonEvent) {
    let gCalEvent;
    if (garoonEvent.isAllDay) {
      gCalEvent = gCal
        .getCalendar()
        .createAllDayEvent(
          garoonEvent.title,
          garoonEvent.term.start,
          garoonEvent.term.end,
          garoonEvent.options,
        );
    } else {
      gCalEvent = gCal
        .getCalendar()
        .createEvent(
          garoonEvent.title,
          garoonEvent.term.start,
          garoonEvent.term.end,
          garoonEvent.options,
        );
    }

    gCalEventService.setTagToEvent(
      gCalEvent,
      garoonEvent.id,
      garoonEvent.updatedAt,
    );
    Logger.log('Create GCal event: ' + garoonEvent.id);
    Utilities.sleep(API_COOL_TIME);
  }

  update(eventArray) {
    this.delete(eventArray[0]);
    this.create(eventArray[1]);
  }

  delete(gCalEvent) {
    gCalEvent.deleteEvent();
    Logger.log(
      'Delete GCal event: ' + gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID),
    );
    Utilities.sleep(API_COOL_TIME);
  }
}
