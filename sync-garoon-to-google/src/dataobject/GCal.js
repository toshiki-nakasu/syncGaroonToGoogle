class GCal {
  constructor(calendarName) {
    this.name = calendarName;
    this.calendar = this.getGCal();
    this.id = this.calendar ? this.calendar.getId() : null;
  }

  getGCal() {
    let retGCal = null;

    const gCalendars = CalendarApp.getOwnedCalendarsByName(this.name);
    if (gCalendars.length) {
      retGCal = gCalendars[0];
      console.info('Get GCal calendar: ' + 'exist target calendar name');
    }
    return retGCal;
  }

  getNextSyncToken() {
    return properties.getProperty(SYNC_TOKEN_PROPERTY_KEY);
  }

  setNextSyncToken(gCalEvents) {
    properties.setProperty(SYNC_TOKEN_PROPERTY_KEY, gCalEvents.nextSyncToken);
  }

  createCalendar() {
    const option = {
      timeZone: properties.getProperty('TimeZone'),
      color: CalendarApp.Color.PURPLE,
    };
    this.calendar = CalendarApp.createCalendar(this.name, option);
    console.info('Createing GCal calendar...');
    Utilities.sleep(5000);

    this.id = this.calendar.getId();
    gCalEventService.getEditedEvents();
    console.warn('Create GCal calendar: ' + 'please notify, color setting');
  }

  truncate() {}
}
