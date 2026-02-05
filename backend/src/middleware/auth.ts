import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { supabase } from '../utils/supabase';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
  };
}

export const authMiddleware = async (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    request.user = {
      id: user.id,
      email: user.email || '',
    };
  } catch (err) {
    return reply.status(401).send({ error: 'Authentication failed' });
  }
};
