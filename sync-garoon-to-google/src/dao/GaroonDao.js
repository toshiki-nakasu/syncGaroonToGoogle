class GaroonDao {
  constructor() {}

  selectEventByTerm(queryParam) {
    const queryUri =
      garoonEventService.createApiUri() +
      '?' +
      Utility.paramToString(queryParam);
    const response = UrlFetchApp.fetch(queryUri, {
      method: 'GET',
      headers: garoonEventService.createApiHeader(),
    });
    return JSON.parse(response.getContentText('UTF-8')).events;
  }

  /**
   * 繰り返し予定、仮予定は登録できません
   */
  createEvent(requestBody) {
    console.log(requestBody);
    console.log(garoonEventService.createApiHeader());
    console.log(garoonEventService.createApiUri());
    const response = UrlFetchApp.fetch(garoonEventService.createApiUri(), {
      method: 'POST',
      headers: garoonEventService.createApiHeader(),
      body: JSON.stringify(requestBody),
    });
    return JSON.parse(response.getContentText('UTF-8'));
  }

  updateEvent() {}
  deleteEvent() {}
}
