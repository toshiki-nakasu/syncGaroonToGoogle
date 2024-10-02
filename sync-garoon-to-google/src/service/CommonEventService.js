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
      if (Utility.isNullOrUndefined(garoonEvent)) continue;
      gCalDao.create(garoonEvent);
    }

    for (const garoonEvent of garoonEditedEvents.delete) {
      if (Utility.isNullOrUndefined(garoonEvent)) continue;
      gCalDao.delete(garoonEvent, gCalAllEvents);
    }

    for (const gCalEvent of garoonEditedEvents.update) {
      if (Utility.isNullOrUndefined(gCalEvent)) continue;
      gCalDao.update(gCalEvent, gCalAllEvents);
    }

    console.info('Sync Garoon To GCal: ' + 'END');
  }

  syncGCalToGaroon(gCalEditedEvents) {}
}
