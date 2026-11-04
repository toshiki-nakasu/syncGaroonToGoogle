import { MAX_CALENDAR_MAPPINGS } from '../src/config/Settings.js';

/** タグとカレンダー名の行の編集を管理する。 */
export class CalendarMappingEditor {
  constructor(container, onClear) {
    this.container = container;
    this.onClear = onClear;
    this.rows = [];
    this.locked = true;
  }

  /** 表示順で設定値を取り出す。 */
  values() {
    return this.rows.map(({ tag, name }) => ({
      tag: tag.value,
      calendarName: name.value,
    }));
  }

  /** 処理中は編集と削除を無効にする。 */
  setDisabled(locked) {
    this.locked = locked;
    this.render();
  }

  /** 行数と入力内容に合わせて各操作の可否を更新する。 */
  render() {
    for (const [index, row] of this.rows.entries()) {
      row.tag.setAttribute('aria-label', `タグ ${index + 1}`);
      row.name.setAttribute('aria-label', `同期先カレンダー名 ${index + 1}`);
      row.tag.disabled = row.name.disabled = this.locked;
      row.plus.disabled =
        this.locked || this.rows.length >= MAX_CALENDAR_MAPPINGS;
      row.minus.disabled = this.locked || this.rows.length === 1;
      row.clear.disabled = this.locked || !row.name.value.trim();
    }
  }

  /** 設定行を追加する。カレンダー本体への書き込みは行わない。 */
  add(mapping = { tag: '', calendarName: '' }) {
    const row = { element: document.createElement('tr') };
    row.tag = document.createElement('input');
    row.tag.type = 'text';
    row.tag.className = 'calendar-tag';
    row.tag.placeholder = 'タグ未指定';
    row.tag.value = mapping.tag;
    row.name = document.createElement('input');
    row.name.type = 'text';
    row.name.className = 'calendar-name';
    row.name.required = true;
    row.name.placeholder = 'カレンダー名';
    row.name.value = mapping.calendarName;
    row.name.addEventListener('input', () => this.render());
    row.plus = this.button('+', '同期先を追加', 'icon-button', () =>
      this.add().tag.focus(),
    );
    row.minus = this.button(
      '−',
      'この同期先の設定行を削除',
      'icon-button',
      () => this.remove(row),
    );
    row.clear = this.button(
      '予定を全削除',
      'このカレンダーの予定を全削除',
      'clear-button',
      () => this.onClear(row.name.value.trim()),
    );
    const source = document.createElement('td');
    const target = document.createElement('td');
    const actions = document.createElement('td');
    const group = document.createElement('div');
    group.className = 'calendar-actions';
    source.append(row.tag);
    target.append(row.name);
    group.append(row.plus, row.minus, row.clear);
    actions.append(group);
    row.element.append(source, target, actions);
    this.container.append(row.element);
    this.rows.push(row);
    this.render();
    return row;
  }

  /** 指定行の設定を削除し、最後の1行は維持する。 */
  remove(row) {
    if (this.rows.length <= 1) return;
    this.rows.splice(this.rows.indexOf(row), 1);
    row.element.remove();
    this.render();
  }

  /** 操作ボタンを生成し、表示名と読み上げ名を設定する。 */
  button(text, label, className, action) {
    const element = document.createElement('button');
    Object.assign(element, {
      type: 'button',
      textContent: text,
      className,
      title: label,
    });
    element.setAttribute('aria-label', label);
    element.addEventListener('click', action);
    return element;
  }
}
