/**
 * All direct Prisma access for the Activity model - the append-only audit
 * log backing both the Lead Details "Timeline" and "Status History" UI.
 */
import { prisma } from "../config/prisma";

export function createActivity(data: {
  leadId: string;
  actorId: string;
  type: string;
  message: string;
}) {
  return prisma.activity.create({ data });
}

export function findActivitiesByLeadId(leadId: string) {
  return prisma.activity.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, name: true } } },
  });
}
