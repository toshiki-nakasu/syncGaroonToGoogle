class GCalEventItem {
  constructor(gCalEvent) {
    this.id;
    this.updatedAt;
    this.eventType = 'REGULAR';
    this.eventMenu = this.createEventMenu(gCalEvent);
    this.subject = this.createSubject(gCalEvent);
    this.notes = gCalEvent.description;
    this.isAllDay = this.checkAllDay(gCalEvent);
    this.term = this.createTerm(gCalEvent);
    this.visibilityType = 'PUBLIC';
    // this.isStartOnly;
  }
}
