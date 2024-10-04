class DatetimeTerm {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  toSyncTargetTerm() {
    let today = now.getDate();
    let start = new Date();
    let end = new Date();

    start.setDate(today - Number(this.start));
    start.setHours(0, 0, 0, 0);

    end.setDate(today + Number(this.start));
    end.setHours(23, 59, 59, 0);
    return new DatetimeTerm(start, end);
  }

  isInTerm(dateTime) {
    return this.start <= dateTime && dateTime <= this.end;
  }
}
