class SyncEventService {
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

  syncGCalToGaroon(gCalEditedEvents, garoonAllEvents) {
    console.info('Sync GCal To Garoon: ' + 'START');
    for (const gCalEvent of gCalEditedEvents.create) {
      // garoonDao.create(gCalEvent);
    }

    for (const gCalEvent of gCalEditedEvents.delete) {
      // garoonDao.delete(gCalEvent, garoonAllEvents);
    }

    for (const gCalEvent of gCalEditedEvents.update) {
      // garoonDao.update(gCalEvent);
    }

    console.info('Sync GCal To Garoon: ' + 'END');
  }
}
