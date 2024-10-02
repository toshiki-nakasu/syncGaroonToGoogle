class GCal {
  constructor(calendarName) {
    this.setName(calendarName);
    this.setCalendar();
    this.id = this.calendar ? this.calendar.getId() : null;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
  }

  getCalendar() {
    return this.calendar;
  }

  setCalendar() {
    let retCalendar;
    const calendars = CalendarApp.getOwnedCalendarsByName(this.name);

    if (1 <= calendars.length) {
      retCalendar = calendars[0];
      console.info('Get GCal calendar: ' + 'exist target calendar name');
    } else {
      retCalendar = gCalDao.createCalendar(this.name);
      this.delNextSyncToken();
    }

    this.calendar = retCalendar;
  }

  getId() {
    return this.id;
  }

  setId(id) {
    this.id = id;
  }

  getNextSyncToken() {
    return properties.getProperty(SYNC_TOKEN_PROPERTY_KEY);
  }

  setNextSyncToken(nextSyncToken) {
    properties.setProperty(SYNC_TOKEN_PROPERTY_KEY, nextSyncToken);
  }

  delNextSyncToken() {
    properties.deleteProperty(SYNC_TOKEN_PROPERTY_KEY);
  }
}
