function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    TimeZone: 'Asia/Tokyo',
    GaroonDomain: 'mamezo-dhd.cybozu.com',
    GaroonUser: 'toshiki-nakasu',
    GaroonPassword: 'Tosi+0022',
    WorkTimeStart: '08:00:00',
    WorkTimeEnd: '21:00:00',
    SyncDaysBefore: '30',
    SyncDaysAfter: '90',
    CalendarName: 'Garoon',
  });
}
