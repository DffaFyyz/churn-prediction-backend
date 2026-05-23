import { Customer } from '@prisma/client';

export type TelcoModelFeatures = Record<string, number>;

export function mapCustomerToTelcoFeatures(
   customer: Customer,
): TelcoModelFeatures {
   return {
      SeniorCitizen: customer.SeniorCitizen,
      tenure: customer.tenure,
      MonthlyCharges: customer.MonthlyCharges,
      TotalCharges: customer.TotalCharges,
      gender_Male: bool(customer.gender === 'Male'),
      Partner_Yes: bool(customer.Partner === 'Yes'),
      Dependents_Yes: bool(customer.Dependents === 'Yes'),
      PhoneService_Yes: bool(customer.PhoneService === 'Yes'),
      'MultipleLines_No phone service': bool(
         customer.MultipleLines === 'No phone service',
      ),
      MultipleLines_Yes: bool(customer.MultipleLines === 'Yes'),
      'InternetService_Fiber optic': bool(
         customer.InternetService === 'Fiber optic',
      ),
      InternetService_No: bool(customer.InternetService === 'No'),
      'OnlineSecurity_No internet service': bool(
         customer.OnlineSecurity === 'No internet service',
      ),
      OnlineSecurity_Yes: bool(customer.OnlineSecurity === 'Yes'),
      'OnlineBackup_No internet service': bool(
         customer.OnlineBackup === 'No internet service',
      ),
      OnlineBackup_Yes: bool(customer.OnlineBackup === 'Yes'),
      'DeviceProtection_No internet service': bool(
         customer.DeviceProtection === 'No internet service',
      ),
      DeviceProtection_Yes: bool(customer.DeviceProtection === 'Yes'),
      'TechSupport_No internet service': bool(
         customer.TechSupport === 'No internet service',
      ),
      TechSupport_Yes: bool(customer.TechSupport === 'Yes'),
      'StreamingTV_No internet service': bool(
         customer.StreamingTV === 'No internet service',
      ),
      StreamingTV_Yes: bool(customer.StreamingTV === 'Yes'),
      'StreamingMovies_No internet service': bool(
         customer.StreamingMovies === 'No internet service',
      ),
      StreamingMovies_Yes: bool(customer.StreamingMovies === 'Yes'),
      'Contract_One year': bool(customer.Contract === 'One year'),
      'Contract_Two year': bool(customer.Contract === 'Two year'),
      PaperlessBilling_Yes: bool(customer.PaperlessBilling === 'Yes'),
      'PaymentMethod_Credit card (automatic)': bool(
         customer.PaymentMethod === 'Credit card (automatic)',
      ),
      'PaymentMethod_Electronic check': bool(
         customer.PaymentMethod === 'Electronic check',
      ),
      'PaymentMethod_Mailed check': bool(
         customer.PaymentMethod === 'Mailed check',
      ),
   };
}

function bool(value: boolean) {
   return value ? 1 : 0;
}
