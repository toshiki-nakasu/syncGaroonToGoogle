class GaroonDao {
  constructor() {}

  apiAction(uri, option) {
    return UrlFetchApp.fetch(uri, option);
  }

  selectEventByTerm(queryParam) {
    const queryUri =
      garoonEventService.createApiUri() +
      '?' +
      Utility.paramToString(queryParam);
    const option = {
      method: 'GET',
      headers: garoonEventService.createApiHeader(),
    };
    const response = this.apiAction(queryUri, option);
    return JSON.parse(response.getContentText('UTF-8')).events;
  }

  /**
   * 繰り返し予定、仮予定は登録できません
   */
  createEvent(requestBody) {
    const option = {
      method: 'POST',
      headers: garoonEventService.createApiHeader(),
      payload: JSON.stringify(requestBody),
    };
    const response = this.apiAction(garoonEventService.createApiUri(), option);
    const statusCode = response.getResponseCode();

    let garoonEvent = null;
    if (200 <= statusCode && statusCode < 300) {
      garoonEvent = garoonEventService.addUniqueId(
        JSON.parse(response.getContentText('UTF-8')),
      );
      console.info('Create Garoon event: ' + garoonEvent.uniqueId);
    }
    return garoonEvent;
  }

  updateEvent() {}
  deleteEvent() {}
}
