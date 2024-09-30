const TAG_GAROON_UNIQUE_EVENT_ID = 'GAROON_UNIQUE_EVENT_ID';
const TAG_GAROON_SYNC_DATETIME = 'GAROON_SYNC_DATETIME';

let properties;
let garoonUser;
let workTerm;
let syncTargetTerm;
let gCal;

let garoonEventService;
let gCalEventService;
let syncGaroonToGCalService;
let syncGCalToGaroonService;

let now;

function initialize() {
  setScriptProperties();
  properties = PropertiesService.getScriptProperties();
  garoonUser = new GaroonUser(
    properties.getProperty('GaroonDomain'),
    properties.getProperty('GaroonUser'),
    properties.getProperty('GaroonPassword'),
  );

  workTerm = new TimeTerm(
    properties.getProperty('WorkTimeStart'),
    properties.getProperty('WorkTimeEnd'),
  ).toDatetimeTerm();

  syncTargetTerm = new DatetimeTerm(
    properties.getProperty('SyncDaysBefore'),
    properties.getProperty('SyncDaysAfter'),
  ).convertSyncTargetTerm();

  garoonEventService = new GaroonEventService();
  gCalEventService = new GCalEventService();
  gCal = new GCal(properties.getProperty('CalendarName'));

  syncGaroonToGCalService = new SyncGaroonToGCalService();
  syncGCalToGaroonService = new SyncGCalToGaroonService();

  now = new Date();
}

function syncGaroonToGCal() {
  initialize();
  if (!workTerm.isInTerm(now)) return;
  let garoonEvents = garoonEventService.getEvent(garoonUser, syncTargetTerm);
  let gCalEvents = gCalEventService.getEvent(syncTargetTerm);
  syncGaroonToGCalService.sync(garoonEvents, gCalEvents);
}

function syncGCalToGaroon() {
  initialize();
  if (!workTerm.isInTerm(now)) return;
  let garoonEvents = garoonEventService.getEvent(garoonUser, syncTargetTerm);
  syncGCalToGaroonService.sync();
}
