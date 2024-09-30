class SyncGaroonToGCalService {
  constructor() {}

  sync(garoonEvents, gCalEvents) {
    console.info('Sync Garoon Event: ' + 'START');
    this.createOrUpdateEvent(garoonEvents, gCalEvents);
    const garoonUniqueEventIds = garoonEvents.map((e) =>
      garoonEventService.getGaroonUniqueEventID(e),
    );
    this.deleteEvent(garoonUniqueEventIds, gCalEvents);
    console.info('Sync Garoon Event: ' + 'END');
  }

  createOrUpdateEvent(garoonEvents, gCalEvents) {
    let garoonUniqueEventID;
    let gCalEvent;
    let garoonEventItem;
    for (const garoonEvent of garoonEvents) {
      garoonUniqueEventID =
        garoonEventService.getGaroonUniqueEventID(garoonEvent);
      console.info('GaroonUniqueEventID: ' + garoonUniqueEventID);
      gCalEvent = gCalEventService.isScheduleByGaroon(
        gCalEvents,
        garoonUniqueEventID,
      );
      if (gCalEvent) {
        if (gCalEventService.isLatestEvent(gCalEvent, garoonEvent)) {
          // TODO タグがないものは消さない！！
          gCalEvent.deleteEvent();
          console.info('Delete GCal event: ' + 'update event');
        } else {
          console.info('Nothing: ' + 'no update');
          continue;
        }
      }

      garoonEventItem = new GaroonEventItem(garoonEvent);
      gCalEventService.createEvent(garoonEventItem, garoonUniqueEventID);
      console.info('Create GCal event: ' + garoonUniqueEventID);

      // 高速連続処理防止
      Utilities.sleep(1000);
    }
  }

  deleteEvent(garoonUniqueEventIds, gCalEvents) {
    let tagUniqueEventID;
    for (const gCalEvent of gCalEvents) {
      tagUniqueEventID = gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID);
      if (!garoonUniqueEventIds.includes(tagUniqueEventID)) {
        gCalEvent.deleteEvent();
        Logger.log('Delete GCal event: ' + tagUniqueEventID);
      }
    }
  }
}
