import { prisma } from '../../utils/prisma.js';
class CustomerRepository {
    async findAll(params) {
        const { page, limit, search, minProbability, maxProbability, contract, internet, riskLevel, minTenure, maxTenure, } = params;
        const where = {
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
    async findById(id) {
        return await prisma.customer.findUnique({
            where: { customerID: id },
        });
    }
    async update(id, data) {
        return await prisma.customer.update({
            where: { customerID: id },
            data,
        });
    }
}
export const customerRepository = new CustomerRepository();
