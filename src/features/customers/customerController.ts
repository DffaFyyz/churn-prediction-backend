import { Request, Response } from 'express';
import {
   CreateCustomerSchema,
   GetCustomerSchema,
   UpdateCustomerSchema,
} from './customerSchema.js';
import { customerService } from './customerService.js';

export const getCustomers = async (req: Request, res: Response) => {
   const query = GetCustomerSchema.parse(req.query);
   const result = await customerService.getCustomers(query);

   res.status(200).json({
      msg: 'success',
      ...result,
   });
};

export const getCustomerById = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const result = await customerService.getCustomerById(id);

   if (!result) {
      return res.status(404).json({ msg: 'Customer not found' });
   }

   res.status(200).json(result);
};

export const createCustomer = async (req: Request, res: Response) => {
   const validation = CreateCustomerSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await customerService.createCustomer(validation.data);

   res.status(201).json(result);
};

export const updateCustomer = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const validation = UpdateCustomerSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await customerService.updateCustomer(validation.data, id);

   res.status(200).json(result);
};

export const deleteCustomer = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   await customerService.deleteCustomer(id);

   res.status(200).json({ ok: true });
};
