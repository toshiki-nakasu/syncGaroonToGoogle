class GaroonEventService {
  constructor() {}

  findEventById(garoonEvents, uniqueEventId) {
    let retEvent = null;

    const eventMap = garoonEvents.map((event) => {
      if (event.id === uniqueEventId) return event;
    });

    if (!Utility.isNullOrUndefined(eventMap.length)) retEvent = eventMap[0];
    return retEvent;
  }

  getAllEvent(term) {
    const apiUri = this.createApiUri(garoonUser.domain, term);
    const apiHeader = this.createApiHeader(garoonUser);
    const response = UrlFetchApp.fetch(apiUri, {
      method: 'get',
      headers: apiHeader,
    });
    return JSON.parse(response.getContentText('UTF-8')).events.map(
      (event) => new GaroonEventItem(event),
    );
  }

  getCreatedEvents(garoonEvents, gCalEvents) {
    return garoonEvents.map((garoonEvent) => {
      if (!commonEventService.isScheduleByGaroon(gCalEvents, garoonEvent.id))
        return garoonEvent;
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
      if (!Utility.isNullOrUndefined(tagUniqueEventID)) continue;

      garoonEvent = this.findEventById(garoonEvents, tagUniqueEventID);

      if (!Utility.isNullOrUndefined(garoonEvent)) {
        deleted.push(garoonEvent);
        continue;
      }

      if (!commonEventService.isLatestGaroonEvent(gCalEvent, garoonEvent)) {
        updated.push(garoonEvent);
      }
    }

    return { create: created, delete: deleted, update: updated };
  }

  /**
   * DateTimeFormat: yyyy-MM-ddTHH:mm:ss+hh:mm
   */
  formatISODateTime(d) {
    return (
      d.getFullYear() +
      '-' +
      Utility.paddingZero(d.getMonth() + 1) +
      '-' +
      Utility.paddingZero(d.getDate()) +
      'T' +
      Utility.paddingZero(d.getHours()) +
      ':' +
      Utility.paddingZero(d.getMinutes()) +
      ':' +
      Utility.paddingZero(d.getSeconds()) +
      (d.getTimezoneOffset() <= 0 ? '+' : '-') +
      Utility.paddingZero(Math.floor(Math.abs(d.getTimezoneOffset()) / 60)) +
      ':' +
      Utility.paddingZero(Math.abs(d.getTimezoneOffset()) % 60)
    );
  }

  createApiUri(domain, term) {
    let apiBaseURI = 'https://' + domain + '/g/api/v1/schedule/events';
    let apiParams = {
      rangeStart: encodeURIComponent(this.formatISODateTime(term.start)),
      rangeEnd: encodeURIComponent(this.formatISODateTime(term.end)),
      orderBy: 'start%20asc',
      limit: 200,
    };
    return apiBaseURI + '?' + Utility.paramToString(apiParams);
  }

  createApiHeader(garoonUser) {
    return {
      'Content-Type': 'application/json',
      'X-Cybozu-Authorization': Utilities.base64Encode(
        garoonUser.id + ':' + garoonUser.password,
      ),
    };
  }
}
