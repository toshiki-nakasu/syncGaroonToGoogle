function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    GaroonDomain: 'mamezo-dhd.cybozu.com',
    GaroonUser: 'toshiki-nakasu',
    GaroonPassword: 'Tosi+0022',
    WorkTimeStart: '8:00',
    WorkTimeEnd: '21:00',
    SyncDaysBefore: '30',
    SyncDaysAfter: '90',
    CalendarName: 'Garoon',
  });
}

// TODO WorkTime外にSyncを実行しない
// TODO workflowでclasp push
