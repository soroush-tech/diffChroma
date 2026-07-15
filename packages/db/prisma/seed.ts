import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "@diffchroma/shared";
import { prisma } from "../src/index.js";

async function main() {
  const slug = config.SEED_CUSTOMER_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const customer = await prisma.customer.upsert({
    where: { slug },
    update: {},
    create: { name: config.SEED_CUSTOMER_NAME, slug },
  });

  const user = await prisma.user.upsert({
    where: { email: config.SEED_ADMIN_EMAIL },
    update: {},
    create: {
      customerId: customer.id,
      email: config.SEED_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(config.SEED_ADMIN_PASSWORD, 10),
      name: "Admin",
      role: "admin",
    },
  });

  const project = await prisma.project.upsert({
    where: { customerId_name: { customerId: customer.id, name: config.SEED_PROJECT_NAME } },
    update: {},
    create: {
      customerId: customer.id,
      name: config.SEED_PROJECT_NAME,
      projectToken: `dc_${randomBytes(24).toString("hex")}`,
    },
  });

  console.log("Seeded:");
  console.log(`  customer: ${customer.name} (${customer.id})`);
  console.log(`  user:     ${user.email} / ${config.SEED_ADMIN_PASSWORD}`);
  console.log(`  project:  ${project.name}`);
  console.log(`  token:    ${project.projectToken}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
