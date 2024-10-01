class GaroonDao {
  constructor() {}

  // TODO 更新対象のカレンダー, eventTypeのチェック
  // TODO uniqueIdなし: Garoonに新規作成, 作成元のGCalにタグ付け
  // TODO uniqueIdあり、かつ最終更新以降の編集がない場合: skip
  // TODO uniqueIdあり、かつ最終更新以降の編集がある場合: Garoonのイベント更新, GCalのタグ更新
  // TODO uniqueIdあり、かつGCalから削除された: Garoonもイベント更新 (メンバーが自分のみの場合削除、2名以上の場合は脱退)
  create() {}
  update() {}
  delete() {}
}
