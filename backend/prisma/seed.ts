import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const name = process.env.ADMIN_NAME || 'Administrador';
  const password = process.env.ADMIN_PASSWORD;
  if (!email) throw new Error('Falta variable de entorno: ADMIN_EMAIL');
  if (!password) throw new Error('Falta variable de entorno: ADMIN_PASSWORD');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`[seed] Admin creado: ${email}`);
  } else {
    console.log(`[seed] Admin ya existe: ${email}`);
  }

  // La configuración de pago es singleton y se edita desde el panel.
  const settingsCount = await prisma.paymentSettings.count();
  if (settingsCount === 0) {
    await prisma.paymentSettings.create({ data: {} });
    console.log('[seed] PaymentSettings inicial creado');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
