const TAG_GAROON_UNIQUE_EVENT_ID = 'GAROON_UNIQUE_EVENT_ID';
const TAG_GAROON_SYNC_DATETIME = 'GAROON_SYNC_DATETIME';

let properties;
let garoonUser;
let syncTargetTerm;
let gCal;

let garoonEventService;
let gCalEventService;
let gCalSyncService;
let garoonSyncService;

function initialize() {
  setScriptProperties();
  properties = PropertiesService.getScriptProperties();
  garoonUser = new GaroonUser(
    properties.getProperty('GaroonDomain'),
    properties.getProperty('GaroonUser'),
    properties.getProperty('GaroonPassword'),
  );
  syncTargetTerm = new DatetimeTerm(
    properties.getProperty('SyncDaysBefore'),
    properties.getProperty('SyncDaysAfter'),
  ).convertSyncTargetTerm();

  garoonEventService = new GaroonEventService();
  gCalEventService = new GCalEventService();
  gCal = new GCal(properties.getProperty('CalendarName'));

  gCalSyncService = new GCalSyncService();
  garoonSyncService = new GaroonSyncService();
}

function syncGaroonToGCal() {
  initialize();
  let garoonEvents = garoonEventService.getEvent(garoonUser, syncTargetTerm);
  let gCalEvents = gCalEventService.getEvent(syncTargetTerm);
  gCalSyncService.syncFromGaroon(garoonEvents, gCalEvents);
}

function syncGCalToGaroon(gCalEvent) {
  initialize();
  let garoonEvents = garoonEventService.getEvent(garoonUser, syncTargetTerm);
  garoonSyncService.syncFromGoogle();
}
