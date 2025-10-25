/**
 * Google Calendarスケジュールイベントサービス
 * @implements {IScheduleEventService}
 */
class GCalEventService {
  constructor(gCalDao, garoonEventService) {
    this.gCalDao = gCalDao;
    this.garoonEventService = garoonEventService;
  }

  // ------------------------------------------------------------
  // Override
  // ------------------------------------------------------------
  findEventByUniqueEventId(gCalEvents, uniqueEventId) {
    return (
      gCalEvents.find(
        (event) =>
          event.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID) === uniqueEventId,
      ) || null
    );
  }

  isAllDay(gCalEvent) {
    // Google Calendarの終日イベントは start.date プロパティを持つ
    // 時刻指定イベントは start.dateTime プロパティを持つ
    return gCalEvent.start.hasOwnProperty('date');
  }

  getByTerm(term) {
    return this.gCalDao.selectEventByTerm(term);
  }

  getCreatedEvents(fullSync = false) {
    return this.gCalDao.getNotSyncedEvents(fullSync);
  }

  getEditedEvents(garoonEvents) {
    let created = [];
    let deleted = [];
    let updated = [];

    const gCalEvents = this.getCreatedEvents();

    let tagUniqueEventID;
    let garoonEvent;
    for (const gCalEvent of gCalEvents) {
      if (gCalEvent.status === Constants.EVENT_STATUS_CANCELLED) {
        deleted.push(gCalEvent);
        continue;
      }

      if (!gCalEvent.hasOwnProperty('extendedProperties')) {
        created.push(gCalEvent);
        continue;
      }

      tagUniqueEventID =
        gCalEvent.extendedProperties.shared[
          Constants.TAG_GAROON_UNIQUE_EVENT_ID
        ];
      garoonEvent = this.garoonEventService.findEventByUniqueEventId(
        garoonEvents,
        tagUniqueEventID,
      );
      updated.push([garoonEvent, gCalEvent]);
    }

    Logger.info(
      `GCal Event: Created count: ${created.length}, Deleted count: ${deleted.length}, Updated count: ${updated.length}`,
    );

    return { create: created, delete: deleted, update: updated };
  }

  createTerm(gCalEvent) {
    let retObj;
    let start = gCalEvent.start;
    let end = gCalEvent.end;

    if (this.isAllDay(gCalEvent)) {
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
      gCalEvent = this.gCalDao.gCal
        .getCalendar()
        .createAllDayEvent(
          garoonEventItem.title,
          garoonEventItem.term.start,
          garoonEventItem.term.end,
          garoonEventItem.options,
        );
    } else {
      gCalEvent = this.gCalDao.gCal
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

  // ------------------------------------------------------------
  // NoOverride
  // ------------------------------------------------------------
  setTagToEvent(gCalEvent, garoonUniqueEventID, garoonUpdatedAt) {
    gCalEvent.setTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID, garoonUniqueEventID);
    gCalEvent.setTag(Constants.TAG_GAROON_SYNC_DATETIME, garoonUpdatedAt);
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
