class GCalDao {
  constructor() {}

  selectByTerm(term) {
    return gCal.getCalendar().getEvents(term.start, term.end);
  }

  getNotSyncedEvents(isFullSync = false) {
    let retEvents = [];
    const syncToken = gCal.getNextSyncToken();

    let option = {};
    if (Utility.isNullOrUndefined(syncToken) || isFullSync) {
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
