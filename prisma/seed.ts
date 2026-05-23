import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const genders = ['Male', 'Female'] as const;
const yesNo = ['Yes', 'No'] as const;
const contracts = ['Month-to-month', 'One year', 'Two year'] as const;
const internetServices = ['DSL', 'Fiber optic', 'No'] as const;
const paymentMethods = [
   'Electronic check',
   'Mailed check',
   'Bank transfer (automatic)',
   'Credit card (automatic)',
] as const;
const multipleLinesOptions = ['Yes', 'No', 'No phone service'] as const;

type RiskFactor = {
   feature: string;
   impact: number;
   shapValue: number;
   direction: 'increases' | 'decreases';
};

function pick<T>(items: readonly T[], index: number): T {
   return items[index % items.length];
}

function round(value: number, digits = 2) {
   const multiplier = 10 ** digits;
   return Math.round(value * multiplier) / multiplier;
}

function clamp(value: number, min: number, max: number) {
   return Math.min(Math.max(value, min), max);
}

function serviceOption(hasInternet: boolean, index: number) {
   if (!hasInternet) return 'No internet service';
   return pick(yesNo, index);
}

function scoreRisk(input: {
   tenure: number;
   contract: string;
   internet: string;
   payment: string;
   monthlyCharges: number;
   techSupport: string;
   onlineSecurity: string;
   seniorCitizen: number;
}) {
   let score = 0.18;

   if (input.contract === 'Month-to-month') score += 0.24;
   if (input.contract === 'Two year') score -= 0.15;
   if (input.internet === 'Fiber optic') score += 0.13;
   if (input.internet === 'No') score -= 0.08;
   if (input.payment === 'Electronic check') score += 0.12;
   if (input.tenure <= 12) score += 0.16;
   if (input.tenure >= 49) score -= 0.12;
   if (input.monthlyCharges >= 85) score += 0.08;
   if (input.techSupport === 'No') score += 0.06;
   if (input.onlineSecurity === 'No') score += 0.05;
   if (input.seniorCitizen === 1) score += 0.04;

   return round(clamp(score, 0.03, 0.97), 4);
}

function riskFactors(input: {
   contract: string;
   internet: string;
   payment: string;
   tenure: number;
   techSupport: string;
   onlineSecurity: string;
   probability: number;
}): RiskFactor[] {
   const factors: RiskFactor[] = [];

   if (input.contract === 'Month-to-month') {
      factors.push({
         feature: 'Month-to-month contract',
         impact: 0.31,
         shapValue: 0.31,
         direction: 'increases',
      });
   } else {
      factors.push({
         feature: `${input.contract} contract`,
         impact: 0.2,
         shapValue: -0.2,
         direction: 'decreases',
      });
   }

   if (input.internet === 'Fiber optic') {
      factors.push({
         feature: 'Fiber optic internet',
         impact: 0.18,
         shapValue: 0.18,
         direction: 'increases',
      });
   }

   if (input.payment === 'Electronic check') {
      factors.push({
         feature: 'Electronic check payment',
         impact: 0.16,
         shapValue: 0.16,
         direction: 'increases',
      });
   }

   factors.push({
      feature: input.tenure <= 12 ? 'Short tenure' : 'Established tenure',
      impact: input.tenure <= 12 ? 0.14 : 0.12,
      shapValue: input.tenure <= 12 ? 0.14 : -0.12,
      direction: input.tenure <= 12 ? 'increases' : 'decreases',
   });

   if (input.techSupport === 'No' || input.onlineSecurity === 'No') {
      factors.push({
         feature: 'Missing support/security services',
         impact: 0.11,
         shapValue: 0.11,
         direction: 'increases',
      });
   }

   return factors
      .sort((a, b) => b.impact - a.impact)
      .slice(0, input.probability >= 0.5 ? 4 : 3);
}

function buildCustomer(index: number): Prisma.CustomerCreateInput {
   const customerID = `CUST-${String(index).padStart(4, '0')}`;
   const gender = pick(genders, index);
   const SeniorCitizen = index % 7 === 0 || index % 11 === 0 ? 1 : 0;
   const Partner = pick(yesNo, index + 1);
   const Dependents = index % 4 === 0 ? 'Yes' : 'No';
   const tenure = clamp((index * 7) % 73, 1, 72);
   const Contract = pick(contracts, index);
   const InternetService = pick(internetServices, index + 1);
   const hasInternet = InternetService !== 'No';
   const PhoneService = index % 9 === 0 ? 'No' : 'Yes';
   const MultipleLines =
      PhoneService === 'No'
         ? 'No phone service'
         : pick(multipleLinesOptions.slice(0, 2), index + 2);
   const PaperlessBilling = index % 3 === 0 ? 'No' : 'Yes';
   const PaymentMethod = pick(paymentMethods, index + 3);
   const MonthlyCharges = round(
      24 +
         (hasInternet ? 28 : 0) +
         (InternetService === 'Fiber optic' ? 18 : 0) +
         (MultipleLines === 'Yes' ? 7 : 0) +
         ((index * 13) % 2300) / 100,
   );
   const TotalCharges = round(
      MonthlyCharges * tenure + ((index * 19) % 900) / 10,
   );
   const OnlineSecurity = serviceOption(hasInternet, index);
   const OnlineBackup = serviceOption(hasInternet, index + 1);
   const DeviceProtection = serviceOption(hasInternet, index + 2);
   const TechSupport = serviceOption(hasInternet, index + 3);
   const StreamingTV = serviceOption(hasInternet, index + 4);
   const StreamingMovies = serviceOption(hasInternet, index + 5);
   const churnProbability = scoreRisk({
      tenure,
      contract: Contract,
      internet: InternetService,
      payment: PaymentMethod,
      monthlyCharges: MonthlyCharges,
      techSupport: TechSupport,
      onlineSecurity: OnlineSecurity,
      seniorCitizen: SeniorCitizen,
   });
   const riskLevel = churnProbability >= 0.5 ? 'HIGH' : 'LOW';
   const Churn = churnProbability >= 0.62 || index % 17 === 0 ? 'Yes' : 'No';
   const lastPredictedAt = new Date(
      Date.now() - ((index % 14) + 1) * 24 * 60 * 60 * 1000,
   );

   return {
      customerID,
      gender,
      SeniorCitizen,
      Partner,
      Dependents,
      tenure,
      Contract,
      PaperlessBilling,
      PaymentMethod,
      MonthlyCharges,
      TotalCharges,
      PhoneService,
      MultipleLines,
      InternetService,
      OnlineSecurity,
      OnlineBackup,
      DeviceProtection,
      TechSupport,
      StreamingTV,
      StreamingMovies,
      Churn,
      churnProbability,
      riskLevel,
      lastPredictedAt,
      riskFactors: riskFactors({
         contract: Contract,
         internet: InternetService,
         payment: PaymentMethod,
         tenure,
         techSupport: TechSupport,
         onlineSecurity: OnlineSecurity,
         probability: churnProbability,
      }) as unknown as Prisma.InputJsonValue,
   };
}

async function main() {
   const customers = Array.from({ length: 200 }, (_, index) =>
      buildCustomer(index + 1),
   );

   await prisma.$transaction(
      customers.map((customer) =>
         prisma.customer.upsert({
            where: { customerID: customer.customerID },
            create: customer,
            update: customer,
         }),
      ),
   );

   await prisma.$transaction(
      customers.map((customer) =>
         prisma.predictionLog.upsert({
            where: { id: `seed-${customer.customerID}` },
            create: {
               id: `seed-${customer.customerID}`,
               customerID: customer.customerID,
               churnProbability: customer.churnProbability ?? 0,
               riskLevel: customer.riskLevel ?? 'LOW',
               topFactors: toFlaskTopFactors(
                  customer.riskFactors as unknown as RiskFactor[],
               ) as unknown as Prisma.InputJsonValue,
               modelVersion: 'synthetic-seed',
               threshold: 0.59,
               createdAt: customer.lastPredictedAt ?? new Date(),
            },
            update: {
               churnProbability: customer.churnProbability ?? 0,
               riskLevel: customer.riskLevel ?? 'LOW',
               topFactors: toFlaskTopFactors(
                  customer.riskFactors as unknown as RiskFactor[],
               ) as unknown as Prisma.InputJsonValue,
               modelVersion: 'synthetic-seed',
               threshold: 0.59,
               createdAt: customer.lastPredictedAt ?? new Date(),
            },
         }),
      ),
   );

   const highRiskCount = customers.filter(
      (customer) => customer.riskLevel === 'HIGH',
   ).length;

   console.log(
      `Seeded ${customers.length} synthetic customers (${highRiskCount} HIGH risk, ${
         customers.length - highRiskCount
      } LOW risk).`,
   );
}

function toFlaskTopFactors(factors: RiskFactor[]) {
   return factors.map((factor) => ({
      feature: factor.feature,
      shap_value: factor.shapValue,
      direction:
         factor.direction === 'increases'
            ? 'increases_risk'
            : 'decreases_risk',
   }));
}

main()
   .catch((error) => {
      console.error(error);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
