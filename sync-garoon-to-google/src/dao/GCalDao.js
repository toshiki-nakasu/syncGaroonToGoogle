class GCalDao {
  constructor() {}

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

  selectEventByTerm(term) {
    return gCal.getCalendar().getEvents(term.start, term.end);
  }

  getNotSyncedEvents(fullSync = false) {
    let retEvents = [];
    const syncToken = gCal.getNextSyncToken();

    let option = {};
    if (Utility.isNullOrUndefined(syncToken) || fullSync) {
      option.singleEvents = true;
    } else {
      option.syncToken = syncToken;
    }

    let response;
    let nextPageToken;
    do {
      option.nextPageToken = nextPageToken;
      response = Calendar.Events.list(gCal.getId(), option);
      retEvents = retEvents.concat(response.items);

      nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    gCal.setNextSyncToken(response.nextSyncToken);
    return retEvents;
  }

  createEvent(garoonEvent) {
    let gCalEvent;
    const title = garoonApiService.createTitle(garoonEvent);
    const term = garoonApiService.createTerm(garoonEvent);
    const option = garoonApiService.createOptions(garoonEvent);

    if (garoonEvent.isAllDay) {
      gCalEvent = gCal
        .getCalendar()
        .createAllDayEvent(title, term.start, term.end, option);
    } else {
      gCalEvent = gCal
        .getCalendar()
        .createEvent(title, term.start, term.end, option);
    }

    gCalEventService.setTagToEvent(
      gCalEvent,
      garoonEvent.uniqueId,
      garoonEvent.updatedAt,
    );
    console.info('Create GCal event: ' + garoonEvent.uniqueId);
    Utilities.sleep(API_COOL_TIME);
  }

  updateEvent(eventArray) {
    this.deleteEvent(eventArray[0]);
    this.createEvent(eventArray[1]);
  }

  deleteEvent(gCalEvent) {
    gCalEvent.deleteEvent();
    console.info(
      'Delete GCal event: ' + gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID),
    );
    Utilities.sleep(API_COOL_TIME);
  }
}
