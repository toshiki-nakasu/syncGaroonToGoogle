import { CalendarClearService, CLEAR_ALARM } from './CalendarClearService.js';

/** 確認済みの削除計画と進捗を保存し、Workerの再起動後も処理を継続する。 */
export class CalendarClearController {
  constructor({ api, operations, settings, connections, status }) {
    Object.assign(this, { api, operations, settings, connections, status });
  }

  /** 保存済みの全削除ジョブが実行中か確認する。 */
  async isRunning() {
    const { calendarClearJob } =
      await this.api.storage.local.get('calendarClearJob');
    return calendarClearJob?.status === 'running';
  }

  /** カレンダーを作成せず、確認用の削除計画を読み取る。 */
  async prepare(calendarName) {
    return this.operations.run(async () => {
      if (await this.isRunning())
        throw new Error('予定の全削除が進行中です。完了までお待ちください。');
      const google = await this.connections.google();
      const preview = await new CalendarClearService(google).prepare(
        calendarName,
      );
      await this.api.storage.local.set({
        calendarClearPreview: preview.exists ? preview : null,
      });
      return {
        exists: preview.exists,
        name: preview.name,
        calendarId: preview.calendarId,
        count: preview.count,
        token: preview.token,
      };
    });
  }

  /** 確認トークンと現在の予定を再照合し、ジョブを登録する。 */
  async start(token) {
    return this.operations.run(() =>
      this.operations.updateSettings(async () => {
        if (await this.isRunning())
          throw new Error('予定の全削除が進行中です。');
        const settings = await this.settings.load();
        if (settings.autoSync)
          throw new Error(
            '自動同期が再開されています。もう一度全削除の確認を行ってください。',
          );
        const { calendarClearPreview } = await this.api.storage.local.get(
          'calendarClearPreview',
        );
        const google = await this.connections.google();
        await new CalendarClearService(google).validatePreview(
          calendarClearPreview,
          token,
        );
        const job = { ...calendarClearPreview, cursor: 0, status: 'running' };
        const { calendarWriteGenerations = {} } =
          await this.api.storage.local.get('calendarWriteGenerations');
        await this.api.storage.local.set({
          calendarClearPreview: null,
          calendarClearJob: job,
          calendarClearProgress: { token: job.token, cursor: 0 },
          calendarWriteGenerations: {
            ...calendarWriteGenerations,
            [job.calendarId]: job.token,
          },
        });
        await this.api.alarms.create(CLEAR_ALARM, { periodInMinutes: 0.5 });
        await this.status.set(
          'clearing',
          `「${job.name}」の予定を全削除しています。0 / ${job.events.length}件`,
          {
            clearResult: null,
            clearProgress: {
              name: job.name,
              done: 0,
              total: job.events.length,
            },
          },
        );
      }),
    );
  }

  /** 処理した予定ごとに進捗を保存し、残件数を確認して完了する。 */
  async processBatch() {
    return this.operations.run(async () => {
      const { calendarClearJob: saved } =
        await this.api.storage.local.get('calendarClearJob');
      if (saved?.status !== 'running') return;
      const job = structuredClone(saved);
      const { calendarClearProgress } = await this.api.storage.local.get(
        'calendarClearProgress',
      );
      if (calendarClearProgress?.token === job.token)
        job.cursor = calendarClearProgress.cursor;
      try {
        const google = await this.connections.google();
        const service = new CalendarClearService(google);
        const complete = await service.runBatch(job, async (progress) => {
          await this.api.storage.local.set({
            calendarClearProgress: {
              token: job.token,
              cursor: progress.cursor,
            },
          });
          await this.status.set(
            'clearing',
            `「${progress.name}」の予定を全削除しています。${progress.cursor} / ${progress.events.length}件`,
            {
              clearProgress: {
                name: progress.name,
                done: progress.cursor,
                total: progress.events.length,
              },
            },
          );
        });
        if (complete) {
          await service.verifyEmpty(job.calendarId);
          const message = `「${job.name}」の予定${job.cursor}件を全削除しました。削除後の残件数: 0件。`;
          await this.api.storage.local.set({
            calendarClearJob: null,
            calendarClearProgress: null,
          });
          await this.api.alarms.clear(CLEAR_ALARM);
          await this.status.set('paused', message, {
            clearProgress: null,
            lastSuccessAt: null,
            summary: null,
            clearResult: {
              status: 'complete',
              name: job.name,
              deleted: job.cursor,
              remaining: 0,
              message,
            },
          });
        }
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        await this.api.storage.local.set({ calendarClearJob: job });
        await this.api.alarms.clear(CLEAR_ALARM);
        const message = `「${job.name}」の全削除を中断しました (${job.cursor} / ${job.events.length}件処理済み)。${error.message} 残りを削除する場合は、設定画面からもう一度対象と件数を確認してください。`;
        await this.status.set('unavailable', message, {
          clearResult: {
            status: 'failed',
            name: job.name,
            deleted: job.cursor,
            message,
          },
        });
      }
    });
  }

  /** 永続化されたジョブと中断時の表示を起動時に復元する。 */
  async restore() {
    const [{ state }, { calendarClearJob: job }, { calendarClearProgress }] =
      await Promise.all([
        this.api.storage.local.get('state'),
        this.api.storage.local.get('calendarClearJob'),
        this.api.storage.local.get('calendarClearProgress'),
      ]);
    if (job?.status === 'running') {
      await this.api.alarms.create(CLEAR_ALARM, { periodInMinutes: 0.5 });
      const done =
        calendarClearProgress?.token === job.token
          ? calendarClearProgress.cursor
          : job.cursor;
      await this.status.set(
        'clearing',
        `「${job.name}」の予定を全削除しています。${done} / ${job.events.length}件`,
        { clearProgress: { name: job.name, done, total: job.events.length } },
      );
      return true;
    }
    if (state?.kind !== 'clearing') return false;
    await this.status.set(
      job?.status === 'failed' ? 'unavailable' : 'paused',
      job?.status === 'failed'
        ? `「${job.name}」の全削除は中断されています。${job.error || '対象と件数をもう一度確認してください。'}`
        : '全削除の処理を終了しました。自動同期は停止中です。',
    );
    return true;
  }
}
