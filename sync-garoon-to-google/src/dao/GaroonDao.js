class GaroonDao {
  constructor() {}

  selectByTerm(term) {
    const apiUri = this.createApiUri(garoonUser.domain, term);
    const apiHeader = this.createApiHeader(garoonUser);
    const response = UrlFetchApp.fetch(apiUri, {
      method: 'get',
      headers: apiHeader,
    });
    return response;
  }

  create() {}
  update() {}
  delete() {}

  createApiUri(domain, term) {
    let apiBaseURI = 'https://' + domain + '/g/api/v1/schedule/events';
    let apiParams = {
      rangeStart: encodeURIComponent(Utility.formatISODateTime(term.start)),
      rangeEnd: encodeURIComponent(Utility.formatISODateTime(term.end)),
      orderBy: 'start%20asc',
      limit: 200,
    };
    return apiBaseURI + '?' + Utility.paramToString(apiParams);
  }

  createApiHeader(garoonUser) {
    return {
      'Content-Type': 'application/json',
      'X-Cybozu-Authorization': Utilities.base64Encode(
        garoonUser.id + ':' + garoonUser.password,
      ),
    };
  }
}
