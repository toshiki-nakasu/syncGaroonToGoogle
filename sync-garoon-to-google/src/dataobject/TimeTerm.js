class TimeTerm {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  timeToDate(timeStr, date) {
    const array = timeStr.split(':');
    let retDate = new Date(date);
    retDate.setHours(Number(array[0]), Number(array[1]), Number(array[2]), 0);
    return retDate;
  }

  toDatetimeTerm() {
    const today = new Date();
    return new DatetimeTerm(
      this.timeToDate(this.start, today),
      this.timeToDate(this.end, today),
    );
  }
}
