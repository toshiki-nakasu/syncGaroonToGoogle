class GaroonEventService {
  constructor() {}

  findEventByUniqueEventId(garoonEvents, uniqueEventId) {
    let retEvent = null;

    const events = garoonEvents.filter((event) => {
      return event.uniqueId === uniqueEventId;
    });

    if (1 <= events.length) retEvent = events[0];
    return retEvent;
  }

  createUniqueId(garoonEvent) {
    const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
    return garoonEvent.id + repeatId;
  }

  addUniqueId(garoonEvent) {
    garoonEvent.uniqueId = this.createUniqueId(garoonEvent);
    return garoonEvent;
  }

  createApiUri() {
    return 'https://' + garoonUser.getDomain() + '/g/api/v1/schedule/events';
  }

  createApiHeader() {
    return {
      'Content-Type': 'application/json',
      'X-Cybozu-Authorization': Utilities.base64Encode(
        garoonUser.getUserName() + ':' + garoonUser.getUserPassword(),
      ),
    };
  }

  getByTerm(term) {
    const requestBody = {
      rangeStart: Utility.formatISODateTime(term.start),
      rangeEnd: Utility.formatISODateTime(term.end),
      orderBy: 'start asc',
      limit: 200,
    };

    const events = garoonDao.selectEventByTerm(requestBody);
    for (let event of events) {
      event = this.addUniqueId(event);
    }
    return events;
  }

  getCreatedEvents(garoonEvents, gCalEvents) {
    return garoonEvents.filter((garoonEvent) => {
      return !gCalEvents.find((gCalevent) => {
        if (
          gCalevent.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === garoonEvent.uniqueId
        )
          return gCalevent;
      });
    });
  }

  /**
   * created: GaroonにはあるのにGCalにはないもの
   * deleted: GaroonのタグはあるのにGaroonにはないもの
   * updated: 最新でないタグのもの
   */
  getEditedEvents(garoonEvents, gCalEvents) {
    let created = [];
    let deleted = [];
    let updated = [];

    created = this.getCreatedEvents(garoonEvents, gCalEvents);

    let garoonEvent;
    let tagUniqueEventID;
    for (const gCalEvent of gCalEvents) {
      tagUniqueEventID = gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID);

      // 手動でGCalで作成されたものはskip
      if (Utility.isNullOrUndefined(tagUniqueEventID)) continue;

      garoonEvent = this.findEventByUniqueEventId(
        garoonEvents,
        tagUniqueEventID,
      );

      if (Utility.isNullOrUndefined(garoonEvent)) {
        deleted.push(gCalEvent);
        continue;
      }

      if (this.isUpdated(gCalEvent, garoonEvent)) {
        updated.push([gCalEvent, garoonEvent]);
      }
    }
    console.info(
      `Garoon Event:\n\tCreated count: ${created.length}\n\tDeleted count: ${deleted.length}\n\tUpdated count: ${updated.length}`,
    );

    return { create: created, delete: deleted, update: updated };
  }

  createTitle(garoonEvent) {
    const eventMenu = garoonEvent.eventMenu
      ? `【${garoonEvent.eventMenu}】`
      : '';
    return eventMenu + garoonEvent.subject;
  }

  getAttendee(garoonEvent, userKey = 'name') {
    let attendee = [];
    for (const user of garoonEvent.attendees) {
      attendee.push(user[userKey].replace('　', ' '));
    }

    return attendee.join(', ');
  }

  createDescription(garoonEvent) {
    const description = [
      '【参加者】',
      this.getAttendee(garoonEvent),
      null,
      '【メモ】',
      garoonEvent.notes,
    ];

    return description.join('\n');
  }

  createOptions(garoonEvent) {
    return {
      description: this.createDescription(garoonEvent),
    };
  }

  createTerm(garoonEvent) {
    let start = new Date(garoonEvent.start.dateTime);
    let end;
    if (garoonEvent.isAllDay) {
      end = new Date(garoonEvent.end.dateTime);

      // Garoonからは終日予定の終了時刻は当日の23:59:59で返ってくるが、GCalendarは翌日00:00:00にする
      end.setSeconds(end.getSeconds() + 1);
    } else {
      if (garoonEvent.isStartOnly) {
        end = new Date(garoonEvent.start.dateTime);
      } else {
        end = new Date(garoonEvent.end.dateTime);
      }
    }
    return new DatetimeTerm(start, end);
  }

  // isCreatedGCal(gCalEvents) {
  //   return gCalEvents.find((gCalevent) => {
  //     if (gCalevent.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === this.uniqueId)
  //       return gCalevent;
  //   });
  // }

  isUpdated(gCalEvent, garoonEvent) {
    const gCalTaggedTime =
      new Date(gCalEvent.getTag(TAG_GAROON_SYNC_DATETIME)) / 1000;
    const garoonUpdatedTime = new Date(garoonEvent.updatedAt) / 1000;

    return gCalTaggedTime < garoonUpdatedTime;
  }

  getIsAllDay(garoonEvent) {
    return garoonEvent.isAllDay ? true : false;
  }

  createEvent(gCalEvent) {
    const term = gCalEventService.createTerm(gCalEvent);
    const requestBody = {
      eventType: 'REGULAR',
      eventMenu: gCalEventService.createEventMenu(gCalEvent),
      subject: gCalEventService.createSubject(gCalEvent),
      notes: gCalEventService.createNotes(gCalEvent),
      start: term.start,
      end: term.end,
      isAllDay: gCalEventService.checkAllDay(gCalEvent),
      attendees: [
        { type: 'USER', code: properties.getProperty('GaroonUserName') },
      ],
    };
    return garoonDao.createEvent(requestBody);
  }
}
