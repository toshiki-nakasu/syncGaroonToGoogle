/** ユースケースの確認に必要なCalendar APIの状態と応答だけを再現する。 */
export class GoogleCalendarFake {
  constructor(
    calendars = [
      { id: 'work', summary: 'Garoon', accessRole: 'owner' },
      { id: 'home', summary: 'family', accessRole: 'owner' },
    ],
  ) {
    this.calendars = structuredClone(calendars);
    this.records = new Map();
    this.removedIds = new Set();
    this.calls = [];
    this.deleted = [];
    this.beforeRequest = null;
    this.retainOnDelete = false;
    this.revision = 0;
    this.fetch = this.fetch.bind(this);
  }

  /** 対象カレンダーへ、テストで明示した予定を配置する。 */
  setEvents(calendarId, events) {
    this.records.set(
      calendarId,
      new Map(structuredClone(events).map((event) => [event.id, event])),
    );
  }

  /** 外部から取得した場合と同じく、予定のコピーを返す。 */
  events(calendarId) {
    return structuredClone([...(this.records.get(calendarId)?.values() || [])]);
  }

  /** 成否を問わず、送信した書き込みリクエストを返す。 */
  get writes() {
    return this.calls.filter(({ method }) => method !== 'GET');
  }

  /** Calendar APIのURLに対してだけ応答し、未知の呼び出しは失敗にする。 */
  async fetch(url, options) {
    const value = new URL(url);
    if (value.origin !== 'https://www.googleapis.com')
      throw new Error(`Unexpected host: ${value.origin}`);
    const path = value.pathname
      .slice('/calendar/v3/'.length)
      .split('/')
      .map(decodeURIComponent);
    const call = {
      url: value,
      path,
      method: options.method,
      headers: options.headers,
      body: options.body ? JSON.parse(options.body) : undefined,
    };
    this.calls.push(call);
    const response = await this.beforeRequest?.(call);
    if (response) return response;
    if (path.join('/') === 'users/me/calendarList') {
      return Response.json({
        kind: 'calendar#calendarList',
        items: structuredClone(this.calendars),
      });
    }
    if (
      path.length === 1 &&
      path[0] === 'calendars' &&
      call.method === 'POST'
    ) {
      const calendar = {
        ...call.body,
        id: `created-${this.calendars.length}`,
        accessRole: 'owner',
      };
      this.calendars.push(calendar);
      return Response.json(calendar);
    }
    if (path[0] !== 'calendars' || path[2] !== 'events')
      throw new Error(`Unexpected API: ${value.pathname}`);
    const calendarId = path[1];
    const eventId = path[3];
    if (!this.calendars.some(({ id }) => id === calendarId))
      return new Response(null, { status: 404 });
    if (!this.records.has(calendarId)) this.records.set(calendarId, new Map());
    const events = this.records.get(calendarId);
    const current = events.get(eventId);
    if (call.method === 'GET') {
      if (!eventId)
        return Response.json({
          kind: 'calendar#events',
          items: this.events(calendarId),
        });
      return current
        ? Response.json(current)
        : new Response(null, { status: 404 });
    }
    if (call.method === 'POST') {
      if (
        events.has(call.body.id) ||
        this.removedIds.has(`${calendarId}|${call.body.id}`)
      )
        return new Response(null, { status: 409 });
      const event = {
        ...call.body,
        etag: `"${++this.revision}"`,
        status: 'confirmed',
      };
      events.set(event.id, event);
      return Response.json(event);
    }
    if (!current) return new Response(null, { status: 404 });
    if (call.headers['If-Match'] && call.headers['If-Match'] !== current.etag)
      return new Response(null, { status: 412 });
    if (call.method === 'PATCH') {
      const event = { ...current, ...call.body, etag: `"${++this.revision}"` };
      events.set(eventId, event);
      return Response.json(event);
    }
    if (call.method === 'DELETE') {
      this.deleted.push({ calendarId, eventId });
      if (!this.retainOnDelete) {
        events.delete(eventId);
        this.removedIds.add(`${calendarId}|${eventId}`);
      }
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected method: ${call.method}`);
  }
}
