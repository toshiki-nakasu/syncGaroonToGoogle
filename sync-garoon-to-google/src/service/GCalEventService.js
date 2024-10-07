class GCalEventService {
  constructor() {}

  findEventByUniqueEventId(gCalEvents, uniqueEventId) {
    let retEvent = null;

    const events = gCalEvents.filter((event) => {
      return event.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === uniqueEventId;
    });

    if (1 <= events.length) retEvent = events[0];
    return retEvent;
  }

  getByTerm(term) {
    return gCalDao.selectEventByTerm(term);
  }

  getNotSyncedEvents(fullSync = false) {
    return gCalDao.getNotSyncedEvents(fullSync);
  }

  getEditedEvents(garoonEvents) {
    let created = [];
    let deleted = [];
    let updated = [];

    const gCalEvents = this.getNotSyncedEvents();

    let tagUniqueEventID;
    let garoonEvent;
    for (const gCalEvent of gCalEvents) {
      if (gCalEvent.status === 'cancelled') {
        deleted.push(gCalEvent);
        continue;
      }

      if (!gCalEvent.hasOwnProperty('extendedProperties')) {
        created.push(gCalEvent);
        continue;
      }

      tagUniqueEventID =
        gCalEvent.extendedProperties.shared[TAG_GAROON_UNIQUE_EVENT_ID];
      garoonEvent = garoonEventService.findEventByUniqueEventId(
        garoonEvents,
        tagUniqueEventID,
      );
      updated.push([garoonEvent, gCalEvent]);
    }

    console.info(
      `GCal Event:\n\tCreated count: ${created.length}\n\tDeleted count: ${deleted.length}\n\tUpdated count: ${updated.length}`,
    );

    return { create: created, delete: deleted, update: updated };
  }

  isAllDay(gCalEvent) {
    let retIsAllDay = false;
    // TODO 時刻がない予定であればtrueにする
    return retIsAllDay;
  }

  createTerm(gCalEvent) {
    let retObj;
    let start = gCalEvent.start;
    let end = gCalEvent.end;

    if (this.isAllDay()) {
      start = new Date(start.date);
      end = new Date(end.date);
      end.setSeconds(end.getSeconds() - 1);

      retObj = new DatetimeTerm(start, end);
    } else {
      start = new Date(start.dateTime);
      end = new Date(end.dateTime);

      retObj = {
        start: {
          dateTime: Utility.formatISODateTime(start),
          timeZone: gCalEvent.start.timeZone,
        },
        end: {
          dateTime: Utility.formatISODateTime(end),
          timeZone: gCalEvent.end.timeZone,
        },
      };
    }

    return retObj;
  }

  createEvent(garoonEventItem, garoonUniqueEventID) {
    let gCalEvent;
    if (garoonEventItem.isAllDay) {
      gCalEvent = gCal
        .getCalendar()
        .createAllDayEvent(
          garoonEventItem.title,
          garoonEventItem.term.start,
          garoonEventItem.term.end,
          garoonEventItem.options,
        );
    } else {
      gCalEvent = gCal
        .getCalendar()
        .createEvent(
          garoonEventItem.title,
          garoonEventItem.term.start,
          garoonEventItem.term.end,
          garoonEventItem.options,
        );
    }

    this.setTagToEvent(
      gCalEvent,
      garoonUniqueEventID,
      garoonEventItem.updatedAt,
    );
  }

  setTagToEvent(gCalEvent, garoonUniqueEventID, garoonUpdatedAt) {
    gCalEvent.setTag(TAG_GAROON_UNIQUE_EVENT_ID, garoonUniqueEventID);
    gCalEvent.setTag(TAG_GAROON_SYNC_DATETIME, garoonUpdatedAt);
  }

  createEventMenu(gCalEvent) {
    let retEventMenu = null;
    const splitTitle = gCalEvent.summary.split('】');
    if (2 <= splitTitle.length) {
      retEventMenu = splitTitle[0].split('【')[0];
    }

    return retEventMenu;
  }

  createSubject(gCalEvent) {
    let retSubject = gCalEvent.summary;
    const splitTitle = retSubject.split('】');
    if (2 <= splitTitle.length) {
      retSubject = splitTitle[1];
    }

    return retSubject;
  }

  createNotes(gCalEvent) {
    let retNotes = null;
    if (!Utility.isNullOrUndefined(gCalEvent.description))
      retNotes = gCalEvent.description;
    return retNotes;
  }

  checkAllDay(gCalEvent) {
    return gCalEvent.start.hasOwnProperty('date');
  }
}
