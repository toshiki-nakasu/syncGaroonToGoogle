class CommonEventService {
  isScheduleByGaroon(gCalEvents, garoonUniqueEventID) {
    return gCalEvents.find((gCalevent) => {
      if (gCalevent.getTag(TAG_GAROON_UNIQUE_EVENT_ID) === garoonUniqueEventID)
        return gCalevent;
    });
  }

  isUpdatedGaroonEvent(gCalEvent, garoonEvent) {
    const gCalTaggedTime =
      new Date(gCalEvent.getTag(TAG_GAROON_SYNC_DATETIME)) / 1000;
    const garoonUpdatedTime = new Date(garoonEvent.updatedAt) / 1000;

    return gCalTaggedTime < garoonUpdatedTime;
  }

  syncGaroonToGCal(garoonEditedEvents, gCalAllEvents) {
    console.info('Sync Garoon To GCal: ' + 'START');
    for (const garoonEvent of garoonEditedEvents.create) {
      gCalDao.create(garoonEvent);
    }

    for (const garoonEvent of garoonEditedEvents.delete) {
      gCalDao.delete(garoonEvent, gCalAllEvents);
    }

    for (const eventArray of garoonEditedEvents.update) {
      gCalDao.update(eventArray);
    }

    console.info('Sync Garoon To GCal: ' + 'END');
  }

  syncGCalToGaroon(gCalEditedEvents) {}
}
