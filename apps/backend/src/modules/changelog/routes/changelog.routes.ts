import { authMiddleware } from '@/modules/auth/middleware/authMiddleware.js';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ChangelogController } from '../controllers/changelog.controller.js';

const changelogEntrySchema = z.object({
  id: z.number(),
  version: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['feature', 'improvement', 'fix']),
  published_at: z.coerce.date(),
  created_at: z.coerce.date(),
  isRead: z.boolean().optional(),
});

export async function changelogRoutes(fastify: FastifyInstance) {
  const controller = new ChangelogController();

  // GET /changelog - Lista todas as entradas
  fastify.get(
    '/changelog',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Lista todas as entradas do changelog com status de leitura',
        tags: ['Changelog'],
        response: {
          200: z.array(changelogEntrySchema),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getAll.bind(controller)
  );

  // GET /changelog/unread - Busca entradas não lidas
  fastify.get(
    '/changelog/unread',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Busca entradas do changelog não lidas pelo usuário',
        tags: ['Changelog'],
        response: {
          200: z.object({
            hasUnread: z.boolean(),
            count: z.number(),
            entries: z.array(changelogEntrySchema),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.getUnread.bind(controller)
  );

  // GET /changelog/has-unread - Verifica rapidamente se há não lidas
  fastify.get(
    '/changelog/has-unread',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Verifica rapidamente se há entradas não lidas',
        tags: ['Changelog'],
        response: {
          200: z.object({
            hasUnread: z.boolean(),
            count: z.number(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.hasUnread.bind(controller)
  );

  // POST /changelog/mark-read - Marca todas como lidas
  fastify.post(
    '/changelog/mark-read',
    {
      preHandler: [authMiddleware.authenticate()],
      schema: {
        description: 'Marca todas as entradas como lidas para o usuário',
        tags: ['Changelog'],
        response: {
          200: z.object({
            success: z.boolean(),
          }),
        },
        security: [{ bearerAuth: [] }],
      },
    },
    controller.markAllAsRead.bind(controller)
  );
}
