class GaroonEventItem {
  constructor(garoonEvent) {
    this.title = this.createTitle(garoonEvent);
    this.options = this.createOptions(garoonEvent);
    this.term = this.createTerm(garoonEvent);
    this.isAllDay = garoonEvent.isAllDay;
  }

  createTitle(garoonEvent) {
    const eventMenu = garoonEvent.eventMenu ? (garoonEvent.eventMenu + " ") : "";
    return eventMenu + garoonEvent.subject;
  }

  createOptions(garoonEvent) {
    return {
      "description": garoonEvent.notes,
    }
  }

  createTerm(garoonEvent) {
    let start = new Date(garoonEvent.start.dateTime);
    let end;
    if (garoonEvent.isAllDay) {
      end = new Date(garoonEvent.end.dateTime);

      // 終日予定の終了時刻はガルーンは当日の23:59:59で返ってくるが、Google Calendarは翌日00:00:00にする
      end.setSeconds(end.getSeconds() + 1);

    } else {
      if (garoonEvent.isStartOnly) {
        end = new Date(garoonEvent.start.dateTime);
      } else {
        end = new Date(garoonEvent.end.dateTime);
      }
    }
    return new DatetimeTerm(start, end);
  }
}
