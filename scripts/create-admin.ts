import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "Admin123@Pixelmon";
  const email = process.argv[4] || "admin@netpixelmon.com";

  console.log(`\nCriando conta de líder no banco de dados...`);
  console.log(`- Usuário: ${username}`);
  console.log(`- E-mail:  ${email}`);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: "OWNER",
      server: "GLOBAL",
      isActive: true,
    },
    create: {
      username,
      email,
      passwordHash,
      role: "OWNER",
      server: "GLOBAL",
      isActive: true,
    },
  });

  console.log(`\n Conta criada com sucesso!`);
  console.log(`ID: ${user.id}`);
  console.log(`Cargo: ${user.role}`);
  console.log(`Servidor: ${user.server}\n`);
}

main()
  .catch((e) => {
    console.error("Erro ao criar conta:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
