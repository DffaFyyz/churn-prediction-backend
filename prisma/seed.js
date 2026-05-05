import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CONTRACTS = ['Month-to-month', 'One year', 'Two year'];
const PAYMENTS = ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'];
const INTERNETS = ['DSL', 'Fiber optic', 'No'];
const YN_NS = ['Yes', 'No', 'No internet service'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}
function bool(p = 0.5) {
  return Math.random() < p;
}

function riskLevelFromScore(score) {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.5) return 'HIGH';
  if (score >= 0.25) return 'MEDIUM';
  return 'LOW';
}

async function main() {
  console.log('🌱 Seeding...');

  // Reset
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({
    data: { email: 'admin@churn.app', password, name: 'Admin User', role: 'ADMIN' },
  });
  await prisma.user.create({
    data: { email: 'agent@churn.app', password, name: 'CS Agent', role: 'AGENT' },
  });
  await prisma.user.create({
    data: { email: 'manager@churn.app', password, name: 'Retention Manager', role: 'MANAGER' },
  });
  console.log('✅ Users created (password: password123)');

  // Customers (50 dummy)
  const customers = [];
  for (let i = 1; i <= 50; i++) {
    const tenure = randInt(0, 72);
    const monthly = Number(rand(20, 120).toFixed(2));
    const total = Number((monthly * tenure + rand(-50, 50)).toFixed(2));
    const contract = pick(CONTRACTS);
    const internet = pick(INTERNETS);

    // Heuristic risk (mock): kontrak pendek + bill tinggi + tenure rendah = lebih berisiko
    let baseScore = 0.2;
    if (contract === 'Month-to-month') baseScore += 0.3;
    if (contract === 'Two year') baseScore -= 0.15;
    if (tenure < 12) baseScore += 0.2;
    if (tenure > 48) baseScore -= 0.15;
    if (monthly > 80) baseScore += 0.15;
    if (internet === 'Fiber optic') baseScore += 0.1;
    baseScore += rand(-0.1, 0.1);
    const score = Math.max(0, Math.min(1, baseScore));

    customers.push({
      customerCode: `CUST-${String(i).padStart(5, '0')}`,
      gender: pick(['Male', 'Female']),
      seniorCitizen: bool(0.2),
      partner: bool(0.5),
      dependents: bool(0.3),
      tenure,
      contract,
      paperlessBilling: bool(0.6),
      paymentMethod: pick(PAYMENTS),
      monthlyCharges: monthly,
      totalCharges: Math.max(0, total),
      phoneService: bool(0.9),
      multipleLines: pick(['Yes', 'No', 'No phone service']),
      internetService: internet,
      onlineSecurity: pick(YN_NS),
      onlineBackup: pick(YN_NS),
      deviceProtection: pick(YN_NS),
      techSupport: pick(YN_NS),
      streamingTV: pick(YN_NS),
      streamingMovies: pick(YN_NS),
      churnRiskScore: Number(score.toFixed(3)),
      riskLevel: riskLevelFromScore(score),
      topRiskFactors: [
        { feature: 'Contract', importance: 0.32 },
        { feature: 'tenure', importance: 0.21 },
        { feature: 'MonthlyCharges', importance: 0.15 },
      ],
      lastPredictedAt: new Date(),
      isChurned: score > 0.7 && bool(0.4),
      createdById: admin.id,
    });
  }
  await prisma.customer.createMany({ data: customers });
  console.log(`✅ ${customers.length} customers created`);

  console.log('🎉 Seed selesai');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
