/**
 * Garoonスケジュールイベントサービス
 * @implements {IScheduleEventService}
 */
class GaroonEventService {
  /**
   * @param {GaroonDao} garoonDao - Garoon DAO
   */
  constructor(garoonDao) {
    this.garoonDao = garoonDao;
    // 循環参照のため、遅延評価で設定される
    this._gCalEventService = null;
  }

  /**
   * GCalEventService を設定（循環参照解決のため）
   * ServiceContainer の初期化時に呼び出される
   * @param {GCalEventService} gCalEventService - Google Calendar イベントサービス
   */
  set gCalEventService(gCalEventService) {
    if (this._gCalEventService !== null) {
      throw new Error('GCalEventService is already set. Cannot overwrite.');
    }
    this._gCalEventService = gCalEventService;
  }

  /**
   * GCalEventService を取得（遅延評価）
   * @returns {GCalEventService}
   * @throws {Error} GCalEventService が未設定の場合
   */
  get gCalEventService() {
    if (this._gCalEventService === null) {
      throw new Error(
        'GCalEventService is not initialized. Set gCalEventService property first.',
      );
    }
    return this._gCalEventService;
  }

  // ------------------------------------------------------------
  // Override
  // ------------------------------------------------------------
  findEventByUniqueEventId(garoonEvents, uniqueEventId) {
    return (
      garoonEvents.find((event) => event.uniqueId === uniqueEventId) || null
    );
  }

  isAllDay(garoonEvent) {
    return garoonEvent.isAllDay ? true : false;
  }

  getByTerm(term) {
    const requestBody = {
      rangeStart: Utility.formatISODateTime(term.start),
      rangeEnd: Utility.formatISODateTime(term.end),
      orderBy: 'start asc',
      limit: Constants.GAROON_MAX_RESULTS_PER_PAGE,
    };

    const events = this.garoonDao.selectEventByTerm(requestBody);
    const filteredEvents = [];
    for (let event of events) {
      if (!this.isNoSyncEvent(event)) {
        event = this.addUniqueId(event);
        filteredEvents.push(event);
      }
    }
    return filteredEvents;
  }

  getCreatedEvents(garoonEvents, gCalEvents) {
    return garoonEvents.filter((garoonEvent) => {
      return !gCalEvents.find((gCalevent) => {
        if (
          gCalevent.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID) ===
          garoonEvent.uniqueId
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
      tagUniqueEventID = gCalEvent.getTag(Constants.TAG_GAROON_UNIQUE_EVENT_ID);

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
    Logger.info(
      `Garoon Event: Created count: ${created.length}, Deleted count: ${deleted.length}, Updated count: ${updated.length}`,
    );

    return { create: created, delete: deleted, update: updated };
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

  createEvent(gCalEvent) {
    const term = this.gCalEventService.createTerm(gCalEvent);
    const requestBody = {
      eventType: 'REGULAR',
      eventMenu: this.gCalEventService.createEventMenu(gCalEvent),
      subject: this.gCalEventService.createSubject(gCalEvent),
      notes: this.gCalEventService.createNotes(gCalEvent),
      start: term.start,
      end: term.end,
      isAllDay: this.gCalEventService.checkAllDay(gCalEvent),
      attendees: [
        { type: 'USER', code: this.garoonDao.garoonUser.getUserName() },
      ],
    };
    return this.garoonDao.createEvent(requestBody);
  }

  // ------------------------------------------------------------
  // NoOverride
  // ------------------------------------------------------------
  isNoSyncEvent(garoonEvent) {
    return garoonEvent.notes.includes(
      `#${Constants.GAROON_TO_GCAL_NOT_SYNC_TAG}`,
    );
  }

  createUniqueId(garoonEvent) {
    const repeatId = garoonEvent.repeatId ? `-${garoonEvent.repeatId}` : '';
    return `${garoonEvent.id}${repeatId}`;
  }

  addUniqueId(garoonEvent) {
    garoonEvent.uniqueId = this.createUniqueId(garoonEvent);
    return garoonEvent;
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

  isUpdated(gCalEvent, garoonEvent) {
    const taggedTimeStr = gCalEvent.getTag(Constants.TAG_GAROON_SYNC_DATETIME);

    // タグが存在しない、または無効な場合は更新が必要と判定
    if (
      Utility.isNullOrUndefined(taggedTimeStr) ||
      taggedTimeStr.trim() === ''
    ) {
      Logger.warn('Sync datetime tag is missing or empty, treating as updated');
      return true;
    }

    const gCalTaggedTime = new Date(taggedTimeStr);
    const garoonUpdatedTime = new Date(garoonEvent.updatedAt);

    // 日付の妥当性チェック
    if (isNaN(gCalTaggedTime.getTime())) {
      Logger.warn(
        `Invalid sync datetime tag: ${taggedTimeStr}, treating as updated`,
      );
      return true;
    }

    if (isNaN(garoonUpdatedTime.getTime())) {
      Logger.warn(
        `Invalid Garoon updated time: ${garoonEvent.updatedAt}, skipping update`,
      );
      return false;
    }

    // 秒単位で比較（ミリ秒の誤差を吸収）
    const gCalSeconds = Math.floor(gCalTaggedTime.getTime() / 1000);
    const garoonSeconds = Math.floor(garoonUpdatedTime.getTime() / 1000);
    return gCalSeconds < garoonSeconds;
  }
}
