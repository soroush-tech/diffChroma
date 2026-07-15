import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "@diffchroma/shared";
import { prisma, type Project, type User } from "@diffchroma/db";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
    project?: Project;
  }
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: "7d" });
}

function bearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/** Dashboard auth: JWT session issued by POST /auth/login. */
export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = bearer(req);
  if (!token) return reply.code(401).send({ error: "unauthorized" });
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return reply.code(401).send({ error: "unauthorized" });
    req.user = user;
  } catch {
    return reply.code(401).send({ error: "unauthorized" });
  }
}

/** CI ingest auth: per-project token used by the GitHub Action. */
export async function requireProject(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = bearer(req);
  if (!token) return reply.code(401).send({ error: "unauthorized" });
  const project = await prisma.project.findUnique({ where: { projectToken: token } });
  if (!project) return reply.code(401).send({ error: "invalid project token" });
  req.project = project;
}
