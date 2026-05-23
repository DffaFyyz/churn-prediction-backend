import { randomUUID } from 'node:crypto';
import { AppError } from '../../utils/appError.js';
import { predictionService } from '../../features/predictions/predictionService.js';
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
    async createCustomer(payload) {
        const { displayName, fullName, ...customerPayload } = payload;
        const customerID = await this.generateCustomerID();
        await customerRepository.create({
            customerID,
            fullName: fullName ?? displayName ?? null,
            ...customerPayload,
            Churn: customerPayload.Churn ?? 'No',
            predictionStatus: 'PENDING',
            predictionError: null,
        });
        return await this.runPredictionAndReturnCustomer(customerID);
    }
    async updateCustomer(payload, id) {
        const { displayName, fullName, ...customerPayload } = payload;
        const updateData = {
            ...customerPayload,
            ...((fullName !== undefined || displayName !== undefined) && {
                fullName: fullName ?? displayName ?? null,
            }),
            predictionStatus: 'PENDING',
            predictionError: null,
        };
        await customerRepository.update(id, updateData);
        return await this.runPredictionAndReturnCustomer(id);
    }
    async deleteCustomer(id) {
        const customer = await customerRepository.findById(id);
        if (!customer) {
            throw new AppError('Customer not found', 404);
        }
        await customerRepository.delete(id);
    }
    async runPredictionAndReturnCustomer(customerID) {
        try {
            await predictionService.runPrediction(customerID);
        }
        catch (error) {
            await customerRepository.markPredictionFailed(customerID, error instanceof Error ? error.message : 'Failed to run prediction');
        }
        const customer = await customerRepository.findById(customerID);
        if (!customer) {
            throw new AppError('Customer not found', 404);
        }
        return this.toCustomerWithName(customer);
    }
    async generateCustomerID() {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const customerID = `CUST-${randomUUID().slice(0, 8).toUpperCase()}`;
            const existing = await customerRepository.findById(customerID);
            if (!existing)
                return customerID;
        }
        throw new AppError('Failed to generate customer ID', 500);
    }
    toCustomerWithName(customer) {
        return {
            ...customer,
            displayName: customer.fullName ?? `Customer ${customer.customerID}`,
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
