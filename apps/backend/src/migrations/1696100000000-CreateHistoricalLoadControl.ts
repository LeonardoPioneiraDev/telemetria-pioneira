import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateHistoricalLoadControl1696100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'historical_load_control',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'job_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'start_date',
            type: 'timestamp',
          },
          {
            name: 'end_date',
            type: 'timestamp',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
            comment: 'pending, running, completed, failed, cancelled',
          },
          {
            name: 'current_checkpoint',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'total_hours',
            type: 'int',
          },
          {
            name: 'hours_processed',
            type: 'int',
            default: 0,
          },
          {
            name: 'events_processed',
            type: 'int',
            default: 0,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('historical_load_control');
  }
}
