import axios from 'axios';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';

const mlClient = axios.create({
  baseURL: ML_API_URL,
  timeout: 5000,
});

/**
 * Map customer record (Prisma) -> payload sesuai dataset Telco
 */
function toMlPayload(c) {
  const yn = (b) => (b ? 'Yes' : 'No');
  return {
    gender: c.gender,
    SeniorCitizen: c.seniorCitizen ? 1 : 0,
    Partner: yn(c.partner),
    Dependents: yn(c.dependents),
    tenure: Number(c.tenure),
    PhoneService: yn(c.phoneService),
    MultipleLines: c.multipleLines,
    InternetService: c.internetService,
    OnlineSecurity: c.onlineSecurity,
    OnlineBackup: c.onlineBackup,
    DeviceProtection: c.deviceProtection,
    TechSupport: c.techSupport,
    StreamingTV: c.streamingTV,
    StreamingMovies: c.streamingMovies,
    Contract: c.contract,
    PaperlessBilling: yn(c.paperlessBilling),
    PaymentMethod: c.paymentMethod,
    MonthlyCharges: Number(c.monthlyCharges),
    TotalCharges: Number(c.totalCharges),
  };
}

export async function predictChurn(customer) {
  const payload = toMlPayload(customer);
  const { data } = await mlClient.post('/predict', payload);
  // Expected: { score: 0.0-1.0, top_factors: [{feature, importance}, ...] }
  return {
    score: data.score,
    topFactors: data.top_factors || [],
  };
}

export function riskLevelFromScore(score) {
  if (score == null) return null;
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.5) return 'HIGH';
  if (score >= 0.25) return 'MEDIUM';
  return 'LOW';
}

export async function checkMlHealth() {
  try {
    const { data } = await mlClient.get('/health', { timeout: 2000 });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
