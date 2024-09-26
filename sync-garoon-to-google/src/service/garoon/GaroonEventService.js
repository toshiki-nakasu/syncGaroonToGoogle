class GaroonEventService {
  paramToString(params) {
    let retString = '';
    for (const key in params) {
      if ('' !== retString) {
        retString += '&';
      }
      retString += key + '=' + params[key];
    }
    return retString;
  }

  /**
   * DateTimeFormat: yyyy-MM-ddTHH:mm:ss+hh:mm
   */
  formatISODateTime(d) {
    return (
      d.getFullYear() +
      '-' +
      ('0' + (d.getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + d.getDate()).slice(-2) +
      'T' +
      ('0' + d.getHours()).slice(-2) +
      ':' +
      ('0' + d.getMinutes()).slice(-2) +
      ':' +
      ('0' + d.getSeconds()).slice(-2) +
      (d.getTimezoneOffset() <= 0 ? '+' : '-') +
      ('0' + Math.floor(Math.abs(d.getTimezoneOffset()) / 60)).slice(-2) +
      ':' +
      ('0' + (Math.abs(d.getTimezoneOffset()) % 60)).slice(-2)
    );
  }

  createApiUri(domain, term) {
    let apiBaseURI = 'https://' + domain + '/g/api/v1/schedule/events';
    let apiParams = {
      rangeStart: encodeURIComponent(this.formatISODateTime(term.start)),
      rangeEnd: encodeURIComponent(this.formatISODateTime(term.end)),
      orderBy: 'start%20asc',
      limit: 200,
    };
    return apiBaseURI + '?' + this.paramToString(apiParams);
  }

  createApiHeader(garoonUser) {
    return {
      'Content-Type': 'application/json',
      'X-Cybozu-Authorization': Utilities.base64Encode(
        garoonUser.id + ':' + garoonUser.password,
      ),
    };
  }

  getEvent(garoonUser, term) {
    const apiUri = this.createApiUri(garoonUser.domain, term);
    const apiHeader = this.createApiHeader(garoonUser);
    const response = UrlFetchApp.fetch(apiUri, {
      method: 'get',
      headers: apiHeader,
    });
    return JSON.parse(response.getContentText('UTF-8')).events;
  }

  /**
   * Google CalendarのTagに設定する予定ID(GaroonのeventIdとreapeatIdの組み合わせて一意にする)
   */
  getGaroonUniqueEventID(garoonEvent) {
    const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
    return garoonEvent.id + repeatId;
  }
}
