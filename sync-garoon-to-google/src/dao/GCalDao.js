class GCalDao {
  constructor() {}
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
  }

  update(garoonEvent, gCalAllEvents) {
    this.delete(garoonEvent, gCalAllEvents);
    this.create(garoonEvent);
  }

  delete(garoonEvent, gCalAllEvents) {
    const gCalEvents = gCalAllEvents.map((event) => {
      const tagUniqueEventID = event.getTag(TAG_GAROON_UNIQUE_EVENT_ID);
      if (tagUniqueEventID === garoonEvent.id) return event;
    });

    for (const gCalEvent of gCalEvents) {
      gCalEvent.deleteEvent();
      Logger.log('Delete GCal event: ' + garoonEvent.id);
    }
  }
}
