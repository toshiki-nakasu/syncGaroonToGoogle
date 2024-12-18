class GaroonApiService {
  createEventApiUri() {
    return 'https://' + garoonUser.getDomain() + '/g/api/v1/schedule/events';
  }

  createPresenceApiUri() {
    return (
      'https://' +
      garoonUser.getDomain() +
      '/g/api/v1/presence/users/code/' +
      encodeURIComponent(garoonUser.getUserName())
    );
  }

  resetPreference() {
    const requestBody = {
      status: {
        code: '',
      },
      notes: '',
    };
    return garoonDao.updatePreference(requestBody);
  }

  createApiHeader() {
    return {
      'Content-Type': 'application/json',
      'X-Cybozu-Authorization': Utilities.base64Encode(
        garoonUser.getUserName() + ':' + garoonUser.getUserPassword(),
      ),
    };
  }
}
