class CommonEventService {
  isScheduleByGaroon(gCalEvents, garoonUniqueEventID) {
    return gCalEvents.find((gCalevent) => {
      if (gCalevent.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === garoonUniqueEventID)
        return gCalevent;
    });
  }

  isLatestGaroonEvent(gCalEvent, garoonEvent) {
    const gCalTaggedTime = new Date(
      gCalEvent.getTag(TAG_GAROON_SYNC_DATETIME),
    ).getTime();
    const garoonUpdatedTime = new Date(garoonEvent.updatedAt).getTime();
    return gCalTaggedTime <= garoonUpdatedTime;
  }

  syncGaroonToGCal(garoonEditedEvents, gCalAllEvents) {
    console.info('Sync Garoon To GCal: ' + 'START');
    for (const garoonEvent of garoonEditedEvents.create) {
      gCalDao.create(garoonEvent);
      Utilities.sleep(API_COOL_TIME);
    }

    for (const garoonEvent of garoonEditedEvents.delete) {
      gCalDao.delete(garoonEvent, gCalAllEvents);
      Utilities.sleep(API_COOL_TIME);
    }

    for (const garoonEvent of garoonEditedEvents.update) {
      gCalDao.update(garoonEvent, gCalAllEvents);
      Utilities.sleep(API_COOL_TIME);
    }

    console.info('Sync Garoon To GCal: ' + 'END');
  }
  syncGCalToGaroon(gCalEditedEvents) {}
}
