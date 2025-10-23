/**
 * Google Calendarの情報を管理するクラス
 */
class GCal {
  /**
   * @param {string} calendarName - カレンダー名
   * @param {ConfigManager} config - 設定管理
   */
  constructor(calendarName, config) {
    Validator.validateRequired(calendarName, 'calendarName', 'GCal');
    Validator.validateObject(config, 'config', 'GCal');

    this.config = config;
    this.setName(calendarName);
    this.setCalendar();
    this.id = this.calendar ? this.calendar.getId() : null;
  }

  /**
   * カレンダー名を取得
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * カレンダー名を設定
   * @param {string} name - カレンダー名
   */
  setName(name) {
    this.name = name;
  }

  /**
   * カレンダーオブジェクトを取得
   * @returns {GoogleAppsScript.Calendar.Calendar}
   */
  getCalendar() {
    return this.calendar;
  }

  /**
   * カレンダーオブジェクトを設定
   * 存在しない場合は新規作成
   */
  setCalendar() {
    let retCalendar;
    const calendars = CalendarApp.getOwnedCalendarsByName(this.name);

    if (1 <= calendars.length) {
      retCalendar = calendars[0];
      Logger.info(`Get GCal calendar: existing calendar "${this.name}" found`);
    } else {
      // カレンダーが存在しない場合は作成
      Logger.info(
        `Calendar "${this.name}" not found. Creating new calendar...`,
      );
      retCalendar = CalendarApp.createCalendar(this.name, {
        summary: `Garoon sync calendar - ${this.name}`,
        timeZone: this.config.getTimeZone(),
      });
      Logger.info(`Successfully created calendar "${this.name}"`);
    }

    this.calendar = retCalendar;
  }

  /**
   * カレンダーIDを取得
   * @returns {string|null}
   */
  getId() {
    return this.id;
  }

  /**
   * カレンダーIDを設定
   * @param {string} id - カレンダーID
   */
  setId(id) {
    this.id = id;
  }

  /**
   * 次回のSync Tokenを取得
   * @returns {string|null}
   */
  getNextSyncToken() {
    return this.config.getNextSyncToken();
  }

  /**
   * 次回のSync Tokenを設定
   * @param {string} nextSyncToken - Sync Token
   */
  setNextSyncToken(nextSyncToken) {
    this.config.setNextSyncToken(nextSyncToken);
  }

  /**
   * Sync Tokenを削除
   */
  delNextSyncToken() {
    this.config.deleteNextSyncToken();
  }
}
