import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@reparaciones.local').toLowerCase();
  const name = process.env.ADMIN_NAME || 'Administrador';
  const password = process.env.ADMIN_PASSWORD || 'Admin1234!';

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

  // Una sola fila de configuración de pago, editable desde el panel.
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
