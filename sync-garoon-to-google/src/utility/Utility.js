class Utility {
  static paramToString(params) {
    let retString = '';
    for (const key in params) {
      if ('' !== retString) {
        retString += '&';
      }
      retString += key + '=' + params[key];
    }
    return retString;
  }

  static paddingZero(value, length = 2) {
    return ('0' + value).slice(-length);
  }

  static isNullOrUndefined(arg) {
    return null === arg || undefined === arg;
  }
}
