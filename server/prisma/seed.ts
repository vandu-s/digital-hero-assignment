/**
 * Seeds the database with a predictable admin/member account and a handful
 * of sample leads so the dashboard and leads table have real data to show.
 *
 * Run with: npm run prisma:seed --workspace=server
 */
import { PrismaClient, LeadStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { SYSTEM_USER_EMAIL } from "../src/config/constants";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Password123!";

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Owns leads submitted through the public, unauthenticated lead form.
  // Random password - nobody is meant to log in as this account.
  await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      name: "System",
      email: SYSTEM_USER_EMAIL,
      passwordHash: await bcrypt.hash(randomUUID(), 10),
      role: "MEMBER",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.test" },
    update: {},
    create: {
      name: "Alex Admin",
      email: "admin@crm.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "jane@crm.test" },
    update: {},
    create: {
      name: "Jane Member",
      email: "jane@crm.test",
      passwordHash,
      role: "MEMBER",
    },
  });

  const sampleLeads: Array<{
    name: string;
    email: string;
    company: string;
    message?: string;
    source: string;
    value: number;
    status: LeadStatus;
    assignedToId: string | null;
  }> = [
    {
      name: "Acme Corp",
      email: "contact@acme.test",
      company: "Acme Inc",
      message: "We're evaluating a CRM for a 12-person sales team — keen on a demo.",
      source: "Website",
      value: 12000,
      status: "QUALIFIED",
      assignedToId: member.id,
    },
    {
      name: "Beta LLC",
      email: "hello@beta.test",
      company: "Beta LLC",
      source: "Referral",
      value: 5000,
      status: "NEW",
      assignedToId: null,
    },
    {
      name: "Gamma Ventures",
      email: "info@gamma.test",
      company: "Gamma Ventures",
      source: "Cold Call",
      value: 30000,
      status: "PROPOSAL_SENT",
      assignedToId: member.id,
    },
    {
      name: "Delta Studio",
      email: "team@delta.test",
      company: "Delta Studio",
      source: "Website",
      value: 8000,
      status: "WON",
      assignedToId: member.id,
    },
    {
      name: "Epsilon Retail",
      email: "sales@epsilon.test",
      company: "Epsilon Retail",
      source: "Referral",
      value: 4000,
      status: "LOST",
      assignedToId: null,
    },
  ];

  // Lead.email has no unique constraint (a real person can submit more
  // than one inquiry), so re-running this script would otherwise duplicate
  // the sample leads. Clear out prior seed leads by email first to keep
  // this script idempotent.
  await prisma.lead.deleteMany({
    where: { email: { in: sampleLeads.map((lead) => lead.email) } },
  });

  for (const data of sampleLeads) {
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        email: data.email,
        company: data.company,
        message: data.message,
        source: data.source,
        value: data.value,
        status: data.status,
        assignedToId: data.assignedToId,
        createdById: admin.id,
      },
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id,
        actorId: admin.id,
        type: "CREATED",
        message: `Lead created by ${admin.name}`,
      },
    });

    if (data.assignedToId) {
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          actorId: admin.id,
          type: "ASSIGNED",
          message: `Assigned to ${member.name}`,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`Admin login:  admin@crm.test / ${SEED_PASSWORD}`);
  console.log(`Member login: jane@crm.test / ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
