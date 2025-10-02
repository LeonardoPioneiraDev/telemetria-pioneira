import { AppDataSource } from '@/data-source.js';
import {
  HistoricalLoadControl,
  HistoricalLoadStatus,
} from '@/entities/historical-load-control.entity.js';
import { DeepPartial } from 'typeorm';
import { BaseRepository } from './base.repository.js';

export class HistoricalLoadControlRepository extends BaseRepository<HistoricalLoadControl> {
  constructor() {
    const repo = AppDataSource.getRepository(HistoricalLoadControl);
    super(repo);
  }

  async findByJobId(jobId: string): Promise<HistoricalLoadControl | null> {
    return this.repository.findOne({ where: { job_id: jobId } });
  }

  async createLoad(data: DeepPartial<HistoricalLoadControl>): Promise<HistoricalLoadControl> {
    const load = this.repository.create(data);
    return this.repository.save(load);
  }

  async updateStatus(
    jobId: string,
    status: HistoricalLoadStatus,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = { status };

    if (status === 'running') {
      updateData.started_at = new Date();
    }

    if (status === 'completed') {
      updateData.completed_at = new Date();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await this.repository.update({ job_id: jobId }, updateData);
  }

  async updateProgress(
    jobId: string,
    checkpoint: Date,
    hoursProcessed: number,
    eventsProcessed: number
  ): Promise<void> {
    await this.repository.update(
      { job_id: jobId },
      {
        current_checkpoint: checkpoint,
        hours_processed: hoursProcessed,
        events_processed: eventsProcessed,
      }
    );
  }

  async findAllActive(): Promise<HistoricalLoadControl[]> {
    return this.repository.find({
      where: [{ status: 'pending' }, { status: 'running' }],
      order: { created_at: 'DESC' },
    });
  }

  async findRecent(limit: number = 10): Promise<HistoricalLoadControl[]> {
    return this.repository.find({
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
