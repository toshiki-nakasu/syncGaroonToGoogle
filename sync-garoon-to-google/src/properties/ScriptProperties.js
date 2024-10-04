function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    TimeZone: 'Asia/Tokyo',
    CalendarName: 'Garoon',

    GaroonDomain: 'mamezo-dhd.cybozu.com',
    GaroonUserName: 'toshiki-nakasu',
    GaroonUserPassword: 'Tosi+0022',

    GaroonProfileType: 'USER',
    GaroonProfileCode: 'toshiki-nakasu',

    WorkTimeStart: '08:00:00',
    WorkTimeEnd: '21:00:00',
    SyncDaysBefore: '60',
    SyncDaysAfter: '180',
  });
}
