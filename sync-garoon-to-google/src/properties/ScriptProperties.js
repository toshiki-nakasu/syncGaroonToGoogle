function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    GaroonDomain: 'mamezo-dhd.cybozu.com',
    GaroonUser: 'toshiki-nakasu',
    GaroonPassword: 'Tosi+0022',
    SyncDaysBefore: '30',
    SyncDaysAfter: '90',
    CalendarName: 'Garoon',
  });
}
