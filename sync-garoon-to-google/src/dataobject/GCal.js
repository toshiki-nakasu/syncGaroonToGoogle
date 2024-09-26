class GCal {
  constructor(calendarName) {
    this.calendar = this.getOrCreateGCal(calendarName);
    this.id = this.calendar.getId();
    this.setNextSyncToken(Calendar.Events.list(this.id).nextSyncToken);
  }

  getGCal() {
    return this.calendar;
  }

  getNextSyncToken() {
    return properties.getProperty('nextSyncToken');
  }

  setNextSyncToken(token) {
    PropertiesService.getScriptProperties().setProperty('nextSyncToken', token);
  }

  createCalendar(calendarName) {
    const option = {
      timeZone: 'Asia/Tokyo',
      color: CalendarApp.Color.PURPLE,
    };
    return CalendarApp.createCalendar(calendarName, option);
  }

  getOrCreateGCal(calendarName) {
    let retGCal;

    const gCals = CalendarApp.getOwnedCalendarsByName(calendarName);
    if (gCals.length) {
      retGCal = gCals[0];
      console.info('Get GCal calendar: ' + 'exist target calendar name');
    } else {
      retGCal = this.createCalendar(calendarName);
      console.info('Create GCal calendar: ' + 'not exist target calendar name');
      console.warn('TODO: ' + 'notify setting');
    }
    return retGCal;
  }

  onCalendarEdit(term) {
    const option = {
      syncToken: this.getNextSyncToken(),
    };

    const gCalEvents = Calendar.Events.list(this.id, option);
    this.setNextSyncToken(gCalEvents.nextSyncToken);
    // TODO itemに格納されてない...
    console.log(gCalEvents.items);
    return gCalEvents.items;
  }
}
