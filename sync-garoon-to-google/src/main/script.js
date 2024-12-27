const SYNC_TOKEN_PROPERTY_KEY = 'nextSyncToken';
const TAG_GAROON_UNIQUE_EVENT_ID = 'GAROON_UNIQUE_EVENT_ID';
const TAG_GAROON_SYNC_DATETIME = 'GAROON_SYNC_DATETIME';
const API_COOL_TIME = 1000;
const GAROON_TO_GCAL_NOT_SYNC_TAG = 'nosync';

let now;
let properties;

let garoonUser;
let garoonProfile;

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
    properties.getProperty('GaroonUserName'),
    properties.getProperty('GaroonUserPassword'),
  );

  garoonProfile = new GaroonProfile(
    properties.getProperty('GaroonProfileType'),
    properties.getProperty('GaroonProfileCode'),
  );

  workTerm = new TimeTerm(
    properties.getProperty('WorkTimeStart'),
    properties.getProperty('WorkTimeEnd'),
  ).toDatetimeTerm();

  syncTargetTerm = new DatetimeTerm(
    properties.getProperty('SyncDaysBefore'),
    properties.getProperty('SyncDaysAfter'),
  ).toSyncTargetTerm();

  garoonApiService = new GaroonApiService();
  garoonEventService = new GaroonEventService();
  gCalEventService = new GCalEventService();
  syncEventService = new SyncEventService();

  garoonDao = new GaroonDao();
  gCalDao = new GCalDao();

  gCal = new GCal(properties.getProperty('CalendarName'));
}

function test() {
  initialize();
  garoonApiService.resetPreference();
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
  gCalEventService.getCreatedEvents(true);
}
