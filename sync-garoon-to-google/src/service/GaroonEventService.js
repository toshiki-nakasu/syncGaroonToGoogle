class GaroonEventService {
  constructor() {}

  findEventByUniqueEventId(garoonEvents, uniqueEventId) {
    let retEvent = null;

    const events = garoonEvents.filter((event) => {
      return event.id === uniqueEventId;
    });

    if (1 <= events.length) retEvent = events[0];
    return retEvent;
  }

  getByTerm(term) {
    const response = garoonDao.selectByTerm(term);
    return JSON.parse(response.getContentText('UTF-8')).events.map(
      (event) => new GaroonEventItem(event),
    );
  }

  getCreatedEvents(garoonEvents, gCalEvents) {
    return garoonEvents.filter((garoonEvent) => {
      return !commonEventService.isScheduleByGaroon(gCalEvents, garoonEvent.id);
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

      if (commonEventService.isUpdatedGaroonEvent(gCalEvent, garoonEvent)) {
        updated.push([gCalEvent, garoonEvent]);
      }
    }

    console.info('Created count: ' + created.length);
    console.info('Deleted count: ' + deleted.length);
    console.info('Updated count: ' + updated.length);

    return { create: created, delete: deleted, update: updated };
  }
}
