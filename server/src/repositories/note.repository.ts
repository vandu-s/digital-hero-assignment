import { prisma } from "../config/prisma";

export function createNote(data: { leadId: string; authorId: string; body: string }) {
  return prisma.note.create({
    data,
    include: { author: { select: { id: true, name: true } } },
  });
}
