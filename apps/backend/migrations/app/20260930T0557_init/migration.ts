#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/fac31c8f8a389fa684fe12f3fc9b8b04ae6e585dbb09b2545c260005768015a7/contract';
import endContract from '../../snapshots/fac31c8f8a389fa684fe12f3fc9b8b04ae6e585dbb09b2545c260005768015a7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Option',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('image_url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('task_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Submission',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('option_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('task_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('worker_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Task',
        columns: [
          col('amount', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('signature', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', {
            notNull: true,
            default: lit('Select the most clickable thumbnail'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('user_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Worker',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('locked_amount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('pending_amount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'User',
        constraint: 'User_address_key',
        columns: ['address'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Worker',
        constraint: 'Worker_address_key',
        columns: ['address'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Option',
        index: 'Option_task_id_idx_5d5ac774',
        columns: ['task_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Submission',
        index: 'Submission_option_id_idx_0c2968fe',
        columns: ['option_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Submission',
        index: 'Submission_task_id_idx_5d5ac774',
        columns: ['task_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Submission',
        index: 'Submission_worker_id_idx_cb94dc7f',
        columns: ['worker_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Option',
        foreignKey: {
          name: 'Option_task_id_fkey',
          columns: ['task_id'],
          references: { schema: 'public', table: 'Task', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Submission',
        foreignKey: {
          name: 'Submission_worker_id_fkey',
          columns: ['worker_id'],
          references: { schema: 'public', table: 'Worker', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Submission',
        foreignKey: {
          name: 'Submission_option_id_fkey',
          columns: ['option_id'],
          references: { schema: 'public', table: 'Option', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Submission',
        foreignKey: {
          name: 'Submission_task_id_fkey',
          columns: ['task_id'],
          references: { schema: 'public', table: 'Task', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Task',
        foreignKey: {
          name: 'Task_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
