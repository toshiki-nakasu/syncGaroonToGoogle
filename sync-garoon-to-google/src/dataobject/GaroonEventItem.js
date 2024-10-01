class GaroonEventItem {
  constructor(garoonEvent) {
    this.id = this.createId(garoonEvent);
    this.title = this.createTitle(garoonEvent);
    this.options = this.createOptions(garoonEvent);
    this.term = this.createTerm(garoonEvent);
    this.updatedAt = garoonEvent.updatedAt;
    this.isAllDay = garoonEvent.isAllDay ? true : false;
  }

  createId(garoonEvent) {
    const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
    return garoonEvent.id + repeatId;
  }

  createTitle(garoonEvent) {
    const eventMenu = garoonEvent.eventMenu
      ? `【${garoonEvent.eventMenu}】`
      : '';
    return eventMenu + garoonEvent.subject;
  }

  getAttendee(garoonEvent, userKey = 'name') {
    let attendee = [];
    for (const user of garoonEvent.attendees) {
      attendee.push(user[userKey].replace('　', ' '));
    }

    return attendee.join(', ');
  }

  createDescription(garoonEvent) {
    const description = [
      '【参加者】',
      this.getAttendee(garoonEvent),
      null,
      '【メモ】',
      garoonEvent.notes,
    ];

    return description.join('\r\n');
  }

  createOptions(garoonEvent) {
    return {
      description: this.createDescription(garoonEvent),
    };
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
