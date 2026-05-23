import { customerRepository } from './customerRepository.js';
class CustomerService {
    async getCustomers(params) {
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
    async getCustomerById(id) {
        const customer = await customerRepository.findById(id);
        if (!customer)
            return null;
        return this.toCustomerWithName(customer);
    }
    async updateCustomer(payload, id) {
        const { displayName: _displayName, ...customerPayload } = payload;
        const updateData = {
            ...customerPayload,
        };
        const customer = await customerRepository.update(id, updateData);
        return this.toCustomerWithName(customer);
    }
    toCustomerWithName(customer) {
        return {
            ...customer,
            displayName: `Customer ${customer.customerID}`,
            riskFactors: this.parseRiskFactors(customer.riskFactors),
            lastUpdated: customer.updatedAt.toISOString(),
            lastPredictedAt: customer.lastPredictedAt?.toISOString() ?? null,
        };
    }
    parseRiskFactors(value) {
        if (!Array.isArray(value))
            return [];
        const riskFactors = [];
        for (const factor of value) {
            if (!factor || typeof factor !== 'object' || Array.isArray(factor)) {
                continue;
            }
            const candidate = factor;
            if (typeof candidate.feature === 'string' &&
                typeof candidate.impact === 'number' &&
                (candidate.direction === 'increases' ||
                    candidate.direction === 'decreases')) {
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
