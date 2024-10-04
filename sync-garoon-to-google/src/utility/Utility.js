class Utility {
  static paramToString(params) {
    let retString = '';
    for (const key in params) {
      if ('' !== retString) {
        retString += '&';
      }
      retString += key + '=' + encodeURIComponent(params[key]);
    }
    return retString;
  }

  static paddingZero(value, length = 2) {
    return ('0' + value).slice(-length);
  }

  static isNullOrUndefined(arg) {
    return null === arg || undefined === arg;
  }

  /**
   * DateTimeFormat: yyyy-MM-ddTHH:mm:ss+hh:mm
   */
  static formatISODateTime(d) {
    return (
      d.getFullYear() +
      '-' +
      Utility.paddingZero(d.getMonth() + 1) +
      '-' +
      Utility.paddingZero(d.getDate()) +
      'T' +
      Utility.paddingZero(d.getHours()) +
      ':' +
      Utility.paddingZero(d.getMinutes()) +
      ':' +
      Utility.paddingZero(d.getSeconds()) +
      (d.getTimezoneOffset() <= 0 ? '+' : '-') +
      Utility.paddingZero(Math.floor(Math.abs(d.getTimezoneOffset()) / 60)) +
      ':' +
      Utility.paddingZero(Math.abs(d.getTimezoneOffset()) % 60)
    );
  }
}
