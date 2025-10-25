class Utility {
  static paramToString(params) {
    let retString = '';
    for (const key in params) {
      if ('' !== retString) {
        retString += '&';
      }
      retString += key + '=' + encodeURIComponent(params[key]);
    }
    return retString;
  }

  static paddingZero(value, length = Constants.DEFAULT_PADDING_LENGTH) {
    return ('0' + value).slice(-length);
  }

  static isNullOrUndefined(arg) {
    return null === arg || undefined === arg;
  }

  /**
   * DateTimeFormat: yyyy-MM-ddTHH:mm:ss+hh:mm
   * @param {Date} d - フォーマットする日時
   * @param {string} [timeZone] - タイムゾーン (省略時はConfigManagerから取得)
   * @returns {string} ISO 8601 形式の日時文字列
   * @throws {Error} 無効な Date オブジェクトが渡された場合
   */
  static formatISODateTime(d, timeZone = null) {
    if (!(d instanceof Date)) {
      throw new Error(
        'Invalid argument: formatISODateTime requires a Date object',
      );
    }

    if (isNaN(d.getTime())) {
      throw new Error('Invalid Date object: Date is NaN');
    }

    // タイムゾーンが指定されていない場合、ConfigManagerから取得
    if (!timeZone) {
      const config = new ConfigManager();
      timeZone = config.getTimeZone();
    }

    try {
      // GAS の Utilities.formatDate で XXX パターン（+09:00形式）を使用
      const formatted = Utilities.formatDate(
        d,
        timeZone,
        "yyyy-MM-dd'T'HH:mm:ssXXX",
      );
      return formatted;
    } catch (error) {
      // フォーマットに失敗した場合はフォールバック処理
      Logger.warn(
        `Timezone formatting failed for ${timeZone}, using fallback`,
        error,
      );

      // UTC でフォーマットして手動でタイムゾーンオフセットを付与
      try {
        const utcFormatted = Utilities.formatDate(
          d,
          'UTC',
          "yyyy-MM-dd'T'HH:mm:ss",
        );
        // タイムゾーンのオフセットを計算（簡易版）
        const offsetMinutes = -d.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const offsetSign = offsetMinutes >= 0 ? '+' : '-';
        const offsetString = `${offsetSign}${String(offsetHours).padStart(
          2,
          '0',
        )}:${String(offsetMins).padStart(2, '0')}`;

        return `${utcFormatted}${offsetString}`;
      } catch (fallbackError) {
        throw new Error(
          `Failed to format date with timezone ${timeZone}: ${fallbackError.message}`,
        );
      }
    }
  }
}
