import { FastifyReply, FastifyRequest } from 'fastify';
import { ChangelogService } from '../services/changelog.service.js';

export class ChangelogController {
  private service: ChangelogService;

  constructor() {
    this.service = new ChangelogService();
  }

  private getUserId(request: FastifyRequest): string {
    return (request.user as { id: string }).id;
  }

  /**
   * GET /changelog - Lista todas as entradas com status de leitura
   */
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const userId = this.getUserId(request);
    const entries = await this.service.getAll(userId);
    return reply.send(entries);
  }

  /**
   * GET /changelog/unread - Busca entradas não lidas
   */
  async getUnread(request: FastifyRequest, reply: FastifyReply) {
    const userId = this.getUserId(request);
    const result = await this.service.getUnread(userId);
    return reply.send(result);
  }

  /**
   * GET /changelog/has-unread - Verifica rapidamente se há não lidas
   */
  async hasUnread(request: FastifyRequest, reply: FastifyReply) {
    const userId = this.getUserId(request);
    const result = await this.service.hasUnread(userId);
    return reply.send(result);
  }

  /**
   * POST /changelog/mark-read - Marca todas como lidas
   */
  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    const userId = this.getUserId(request);
    await this.service.markAllAsRead(userId);
    return reply.send({ success: true });
  }
}
