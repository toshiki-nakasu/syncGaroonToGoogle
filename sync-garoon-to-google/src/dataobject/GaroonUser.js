class GaroonUser {
  constructor(domain, userName, userPassword) {
    this.domain = domain;
    this.userName = userName;
    this.userPassword = userPassword;
  }

  getDomain() {
    return this.domain;
  }
  getUserName() {
    return this.userName;
  }
  getUserPassword() {
    return this.userPassword;
  }
}
