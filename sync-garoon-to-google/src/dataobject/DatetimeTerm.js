class DatetimeTerm {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  convertSyncTargetTerm() {
    let today = now.getDate();
    let start = new Date();
    let end = new Date();

    start.setDate(today - this.start);
    start.setHours(0, 0, 0, 0);

    end.setDate(today + this.end);
    end.setHours(23, 59, 59, 0);
    return new DatetimeTerm(start, end);
  }

  isInTerm(dateTime) {
    return this.start <= dateTime && dateTime <= this.end;
  }
}
