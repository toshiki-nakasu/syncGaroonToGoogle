class GaroonUser {
  constructor(domain, id, password) {
    this.domain = domain;
    this.id = id;
    this.password = password;
  }

  getDomain() {
    return this.domain;
  }
  getId() {
    return this.id;
  }
  getPassword() {
    return this.password;
  }
}
