import { Prisma, Customer } from '@prisma/client';
import { customerRepository } from './customerRepository.js';
import {
   CustomerWithName,
   GetCustomerSchema,
   GetCustomersResponse,
   RiskFactor,
   UpdateCustomerRequest,
} from './customerTypes.js';

class CustomerService {
   async getCustomers(params: GetCustomerSchema): Promise<GetCustomersResponse> {
      const { data, total } = await customerRepository.findAll(params);

      return {
         data: data.map((customer) => this.toCustomerWithName(customer)),
         meta: {
            page: params.page,
            limit: params.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / params.limit),
         },
      };
   }

   async getCustomerById(id: string): Promise<CustomerWithName | null> {
      const customer = await customerRepository.findById(id);
      if (!customer) return null;

      return this.toCustomerWithName(customer);
   }

   async updateCustomer(
      payload: UpdateCustomerRequest,
      id: string,
   ): Promise<CustomerWithName> {
      const { displayName: _displayName, ...customerPayload } = payload;

      const updateData: Prisma.CustomerUpdateInput = {
         ...customerPayload,
      };

      const customer = await customerRepository.update(id, updateData);
      return this.toCustomerWithName(customer);
   }

   private toCustomerWithName(customer: Customer): CustomerWithName {
      return {
         ...customer,
         displayName: `Customer ${customer.customerID}`,
         riskFactors: this.parseRiskFactors(customer.riskFactors),
         lastUpdated: customer.updatedAt.toISOString(),
         lastPredictedAt: customer.lastPredictedAt?.toISOString() ?? null,
      };
   }

   private parseRiskFactors(value: Prisma.JsonValue): RiskFactor[] {
      if (!Array.isArray(value)) return [];

      const riskFactors: RiskFactor[] = [];

      for (const factor of value) {
         if (!factor || typeof factor !== 'object' || Array.isArray(factor)) {
            continue;
         }

         const candidate = factor as Record<string, unknown>;
         if (
            typeof candidate.feature === 'string' &&
            typeof candidate.impact === 'number' &&
            (candidate.direction === 'increases' ||
               candidate.direction === 'decreases')
         ) {
            riskFactors.push({
               feature: candidate.feature,
               impact: candidate.impact,
               direction: candidate.direction,
            });
         }
      }

      return riskFactors;
   }
}

export const customerService = new CustomerService();
