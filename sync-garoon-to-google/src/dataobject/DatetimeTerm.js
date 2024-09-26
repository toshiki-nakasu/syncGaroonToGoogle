class DatetimeTerm {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  getStart() {
    return this.start;
  }

  getEnd() {
    return this.end;
  }

  convertSyncTargetTerm() {
    let today = new Date();
    let start = new Date();
    let end = new Date();

    start.setDate(today.getDate() - this.start);
    start.setHours(0, 0, 0, 0);

    end.setDate(today.getDate() + this.end);
    end.setHours(23, 59, 59, 0);
    return new DatetimeTerm(start, end);
  }
}
