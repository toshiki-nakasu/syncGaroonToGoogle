class SyncEventService {
  constructor() {}

  syncGaroonToGCal(garoonEditedEvents, gCalAllEvents) {
    console.info('Sync Garoon To GCal: ' + 'START');
    for (const garoonEvent of garoonEditedEvents.create) {
      gCalDao.createEvent(garoonEvent);
    }

    for (const garoonEvent of garoonEditedEvents.delete) {
      gCalDao.deleteEvent(garoonEvent, gCalAllEvents);
    }

    for (const eventArray of garoonEditedEvents.update) {
      gCalDao.updateEvent(eventArray);
    }

    console.info('Sync Garoon To GCal: ' + 'END');
  }

  syncGCalToGaroon(gCalEditedEvents, garoonAllEvents) {
    console.info('Sync GCal To Garoon: ' + 'START');

    let term;
    let requestBody;
    for (const gCalEvent of gCalEditedEvents.create) {
      term = gCalEventService.createTerm(gCalEvent);
      requestBody = {};
      // garoonDao.createEvent(requestBody);
    }

    for (const gCalEvent of gCalEditedEvents.delete) {
      // garoonDao.deleteEvent(gCalEvent, garoonAllEvents);
    }

    for (const gCalEvent of gCalEditedEvents.update) {
      // garoonDao.updateEvent(gCalEvent);
    }

    console.info('Sync GCal To Garoon: ' + 'END');
  }
}
