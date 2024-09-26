const TAG_GAROON_UNIQUE_EVENT_ID = 'GAROON_UNIQUE_EVENT_ID';
const TAG_GAROON_SYNC_DATETIME = 'GAROON_SYNC_DATETIME';

let properties;
let garoonUser;
let syncTargetTerm;

let garoonEventService;
let gCalEventService;
let googleSyncService;
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
  gCalEventService = new GCalEventService(
    properties.getProperty('CalendarName'),
  );
  googleSyncService = new GoogleSyncService();
  garoonSyncService = new GaroonSyncService();
}

function main() {
  initialize();
  let garoonEvents = garoonEventService.getEvent(garoonUser, syncTargetTerm);
  let gCalEvents = gCalEventService.getEvent(syncTargetTerm);

  // Garoon -> GoogleCalendar
  googleSyncService.syncFromGaroon(garoonEvents, gCalEvents);

  // GoogleCalendar -> Garoon
  // TODO
  garoonSyncService.syncFromGoogle();
}
