class GCalDao {
  constructor() {}

  selectByTerm(term) {
    return gCal.calendar.getEvents(term.start, term.end);
  }

  createCalendar() {
    const option = {
      timeZone: properties.getProperty('TimeZone'),
      color: CalendarApp.Color.PURPLE,
    };
    this.calendar = CalendarApp.createCalendar(this.name, option);
    console.info('Createing GCal calendar...');
    Utilities.sleep(API_COOL_TIME * 5);

    this.id = this.calendar.getId();
    gCalEventService.getEditedEvents();
    console.warn('Create GCal calendar: ' + 'please notify, color setting');
  }

  create(garoonEvent) {
    let gCalEvent;
    if (garoonEvent.isAllDay) {
      gCalEvent = gCal.calendar.createAllDayEvent(
        garoonEvent.title,
        garoonEvent.term.start,
        garoonEvent.term.end,
        garoonEvent.options,
      );
    } else {
      gCalEvent = gCal.calendar.createEvent(
        garoonEvent.title,
        garoonEvent.term.start,
        garoonEvent.term.end,
        garoonEvent.options,
      );
    }

    gCalEventService.setTagToEvent(gCalEvent, garoonEvent.id);
    Logger.log('Create GCal event: ' + garoonEvent.id);
    Utilities.sleep(API_COOL_TIME);
  }

  update(garoonEvent, gCalAllEvents) {
    this.delete(garoonEvent, gCalAllEvents);
    this.create(garoonEvent);
  }

  delete(gCalEvent) {
    gCalEvent.deleteEvent();
    Logger.log(
      'Delete GCal event: ' + gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID),
    );
    Utilities.sleep(API_COOL_TIME);
  }
}
