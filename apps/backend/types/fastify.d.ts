import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      username: string;
      role: string;
      permissions: string[];
    };
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      username: string;
      role: string;
      permissions: string[];
      iat: number;
      exp: number;
    };
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
      permissions: string[];
    };
  }
}