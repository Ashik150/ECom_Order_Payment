import { PrismaClient, ProductStatus, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('Assessment123!', 12)

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Assessment Admin',
      email: 'admin@example.com',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Demo Customer',
      email: 'user@example.com',
      passwordHash,
      role: Role.USER,
    },
  })

  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  })
  const computers = await prisma.category.upsert({
    where: { slug: 'computers' },
    update: { parentId: electronics.id },
    create: {
      name: 'Computers',
      slug: 'computers',
      parentId: electronics.id,
    },
  })
  const accessories = await prisma.category.upsert({
    where: { slug: 'computer-accessories' },
    update: { parentId: computers.id },
    create: {
      name: 'Computer Accessories',
      slug: 'computer-accessories',
      parentId: computers.id,
    },
  })
  const home = await prisma.category.upsert({
    where: { slug: 'home-office' },
    update: {},
    create: { name: 'Home Office', slug: 'home-office' },
  })

  const products = [
    {
      name: 'Atlas Mechanical Keyboard',
      sku: 'ATLAS-KEY-001',
      description: 'Tactile hot-swappable keyboard with a compact aluminum frame.',
      price: '129.00',
      stock: 18,
      categoryId: accessories.id,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Arc Wireless Mouse',
      sku: 'ARC-MSE-002',
      description: 'Ergonomic wireless mouse with silent switches and USB-C charging.',
      price: '64.50',
      stock: 32,
      categoryId: accessories.id,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Northstar Laptop Stand',
      sku: 'NST-STD-003',
      description: 'Adjustable aluminum stand designed for comfortable desk setups.',
      price: '78.25',
      stock: 21,
      categoryId: computers.id,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Field Desk Lamp',
      sku: 'FLD-LMP-004',
      description: 'Dimmable task lamp with warm and neutral lighting modes.',
      price: '89.90',
      stock: 12,
      categoryId: home.id,
      status: ProductStatus.ACTIVE,
    },
    {
      name: 'Legacy USB Hub',
      sku: 'LGC-HUB-005',
      description: 'Archived four-port USB hub retained for inactive-product testing.',
      price: '24.00',
      stock: 0,
      categoryId: accessories.id,
      status: ProductStatus.INACTIVE,
    },
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    })
  }
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
