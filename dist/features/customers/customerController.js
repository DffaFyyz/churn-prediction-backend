import { GetCustomerSchema, UpdateCustomerSchema } from './customerSchema.js';
import { customerService } from './customerService.js';
export const getCustomers = async (req, res) => {
    const query = GetCustomerSchema.parse(req.query);
    const result = await customerService.getCustomers(query);
    res.status(200).json({
        msg: 'success',
        ...result,
    });
};
export const getCustomerById = async (req, res) => {
    const id = req.params.id;
    const result = await customerService.getCustomerById(id);
    if (!result) {
        return res.status(404).json({ msg: 'Customer not found' });
    }
    res.status(200).json(result);
};
export const updateCustomer = async (req, res) => {
    const id = req.params.id;
    const validation = UpdateCustomerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ errors: validation.error.format() });
    }
    const result = await customerService.updateCustomer(validation.data, id);
    res.status(200).json(result);
};
