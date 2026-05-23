import { Prisma, Customer } from '@prisma/client';
import { prisma } from '@/utils/prisma.js';
import { GetCustomerSchema } from './customerTypes.js';

class CustomerRepository {
   async findAll(params: GetCustomerSchema) {
      const {
         page,
         limit,
         search,
         minProbability,
         maxProbability,
         contract,
         internet,
         riskLevel,
         minTenure,
         maxTenure,
      } = params;

      const where: Prisma.CustomerWhereInput = {
         ...(contract && { Contract: contract }),
         ...(internet && { InternetService: internet }),
         ...(riskLevel && { riskLevel }),
      };

      if (minProbability !== undefined || maxProbability !== undefined) {
         where.churnProbability = {
            ...(minProbability !== undefined && { gte: minProbability }),
            ...(maxProbability !== undefined && { lte: maxProbability }),
         };
      }

      if (minTenure !== undefined || maxTenure !== undefined) {
         where.tenure = {
            ...(minTenure !== undefined && { gte: minTenure }),
            ...(maxTenure !== undefined && { lte: maxTenure }),
         };
      }

      if (search) {
         where.OR = [
            { fullName: { contains: search, mode: 'insensitive' } },
            { customerID: { contains: search, mode: 'insensitive' } },
            { Contract: { contains: search, mode: 'insensitive' } },
            { InternetService: { contains: search, mode: 'insensitive' } },
         ];
      }

      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
         prisma.customer.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit,
         }),
         prisma.customer.count({ where }),
      ]);

      return { data, total };
   }

   async findById(id: string): Promise<Customer | null> {
      return await prisma.customer.findUnique({
         where: { customerID: id },
      });
   }

   async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
      return await prisma.customer.create({
         data,
      });
   }

   async update(
      id: string,
      data: Prisma.CustomerUpdateInput,
   ): Promise<Customer> {
      return await prisma.customer.update({
         where: { customerID: id },
         data,
      });
   }

   async markPredictionFailed(id: string, message: string): Promise<Customer> {
      return await prisma.customer.update({
         where: { customerID: id },
         data: {
            predictionStatus: 'FAILED',
            predictionError: message,
         },
      });
   }

   async delete(id: string): Promise<Customer> {
      return await prisma.customer.delete({
         where: { customerID: id },
      });
   }
}

export const customerRepository = new CustomerRepository();
