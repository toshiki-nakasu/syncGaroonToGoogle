const SYNC_TOKEN_PROPERTY_KEY = 'nextSyncToken';
const TAG_GAROON_UNIQUE_EVENT_ID = 'GAROON_UNIQUE_EVENT_ID';
const TAG_GAROON_SYNC_DATETIME = 'GAROON_SYNC_DATETIME';
const API_COOL_TIME = 1000;

let now;
let properties;

let garoonUser;
let workTerm;
let syncTargetTerm;
let gCal;

let syncEventService;
let garoonEventService;
let gCalEventService;
let garoonDao;
let gCalDao;

function initialize() {
  now = new Date();
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

  syncEventService = new SyncEventService();
  garoonEventService = new GaroonEventService();
  gCalEventService = new GCalEventService();
  garoonDao = new GaroonDao();
  gCalDao = new GCalDao();

  gCal = new GCal(properties.getProperty('CalendarName'));
}

function test() {
  initialize();
}

function sync() {
  initialize();
  if (!workTerm.isInTerm(now)) return;

  const garoonAllEvents = garoonEventService.getByTerm(syncTargetTerm);
  const gCalAllEvents = gCalEventService.getByTerm(syncTargetTerm);

  const garoonEditedEvents = garoonEventService.getEditedEvents(
    garoonAllEvents,
    gCalAllEvents,
  );
  const gCalEditedEvents = gCalEventService.getEditedEvents(garoonAllEvents);

  syncEventService.syncGaroonToGCal(garoonEditedEvents, gCalAllEvents);
  syncEventService.syncGCalToGaroon(gCalEditedEvents, garoonAllEvents);

  // 最後にsynctoken最新化して終了すること
  gCalDao.getNotSyncedEvents(true);
}
