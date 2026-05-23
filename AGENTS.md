# Retentio Backend Rules

This is the Express backend for Retentio, a churn prediction CRM for telco customers.

## Architecture

Follow the HIMTI internal backend architecture style, but do not copy HIMTI business logic.

Feature modules live in:

```txt
src/features/<featureName>/
  featureController.ts
  featureService.ts
  featureRepository.ts
  featureRoutes.ts
  featureSchema.ts
  featureTypes.ts
```

Rules:

- Controllers stay thin: parse params/query/body, validate with Zod, call service, return response.
- Services own business logic, orchestration, ML calls, and response formatting.
- Repositories own Prisma queries only.
- `src/routes/routes.ts` is the route aggregator.
- Errors should go through `globalErrorHandler` where practical.
- Use `AppError` for operational service errors.

## Tech Stack

- Express
- TypeScript
- Prisma
- PostgreSQL
- BetterAuth
- Zod
- CORS

## Auth And Roles

Authentication uses BetterAuth email/password, not OAuth.

BetterAuth is mounted in `src/index.ts` before `express.json()`:

```ts
app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json());
```

User roles are simple enum fields on `User`, not normalized RBAC tables:

```prisma
enum UserRole {
   CS_AGENT
   MANAGER
}
```

`User.role` defaults to `CS_AGENT`.

Permission checks still use `requirePermission(permissionName)` so routes remain clear. The permission map is in `src/middleware/permissionMiddleware.ts`.

Current permissions include:

- `view_customers`
- `manage_customers`
- `run_prediction`
- `view_predictions`
- `create_intervention`
- `view_analytics`
- `manage_risk_settings`
- `batch_upload_customers`

Until a role-management UI exists, `CS_AGENT` has `manage_customers` so CRUD is usable from the frontend.

## Frontend Contract

The React frontend is in:

```txt
../Churn_frontend
```

Read these files before changing API contracts:

- `../Churn_frontend/src/lib/api.ts`
- `../Churn_frontend/src/types/index.ts`

The frontend talks only to this Express backend.

Implemented frontend-facing endpoints:

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/overview`
- `POST /api/predictions/:customerID/run`
- `GET /api/predictions/history`
- `GET /api/predictions/distribution`
- `GET /api/analytics/by-contract`

`GET /api/customers` returns:

```ts
{
  msg: 'success',
  data: CustomerWithName[],
  meta: {
    page: number
    limit: number
    totalRecords: number
    totalPages: number
  }
}
```

`GET /api/customers/:id`, `POST /api/customers`, and `PATCH /api/customers/:id` return a raw `CustomerWithName`.

`DELETE /api/customers/:id` returns:

```ts
{ ok: true }
```

## Customer CRUD And Prediction

Customer create/update must not accept prediction-owned fields from the frontend.

Frontend-provided fields are customer feature fields only. The backend/model owns:

- `customerID`
- `churnProbability`
- `riskLevel`
- `riskFactors`
- `lastPredictedAt`
- `predictionStatus`
- `predictionError`
- `PredictionLog`

Create flow:

1. Validate request with `CreateCustomerSchema`.
2. Generate `customerID`.
3. Save customer fields.
4. Attempt ML prediction.
5. If prediction succeeds:
   - update latest prediction fields on `Customer`
   - set `predictionStatus = SUCCESS`
   - clear `predictionError`
   - insert `PredictionLog`
6. If prediction fails:
   - keep customer saved
   - set `predictionStatus = FAILED`
   - store `predictionError`

Update flow:

1. Validate request with `UpdateCustomerSchema`.
2. Save edited customer fields.
3. Set `predictionStatus = PENDING`.
4. Attempt ML prediction.
5. Save success or failure as above.

Delete flow:

- Delete customer by `customerID`.
- Prediction logs cascade via Prisma relation.

## ML Service Contract

The Flask ML service is located at:

```txt
/home/erzeltra/daffa/college/4th-Semester/Machine-Learning/churn-prediction/app.py
```

Ignore `app-claude.py`; this project uses `app.py`.

Flask exposes:

```txt
POST /predict
```

Default URL:

```txt
http://localhost:5000
```

Override with:

```txt
ML_SERVICE_URL
```

Flask response:

```json
{
  "churn_probability": 0.4321,
  "risk_level": "LOW",
  "top_factors": [
    {
      "feature": "tenure",
      "shap_value": -0.1234,
      "direction": "decreases_risk"
    }
  ]
}
```

Important:

- Do not send raw customer rows directly to Flask.
- Use `src/features/predictions/telcoFeatureMapper.ts` to convert database customer fields into the exact model feature JSON.
- Express handles auth, roles, database writes, prediction logging, and frontend formatting.
- Flask stays thin: no auth, no database, no CRM business logic.

## Prediction Persistence

Store both the latest prediction snapshot and history:

- `Customer.churnProbability`
- `Customer.riskLevel`
- `Customer.riskFactors`
- `Customer.lastPredictedAt`
- `Customer.predictionStatus`
- `Customer.predictionError`
- `PredictionLog`

`Customer` fields are for fast dashboard/customer-list reads.

`PredictionLog` is the audit/history table and stores raw Flask `top_factors`.

Use:

```bash
npm run prisma:predict-customers
```

to batch-refresh all customers from the running Flask service.

## Prisma

Use Prisma models and enums in `prisma/schema.prisma`.

Current domain tables include:

- `User`
- `Session`
- `Account`
- `Verification`
- `Customer`
- `PredictionLog`

Customer risk is binary:

```prisma
enum RiskLevel {
   LOW
   HIGH
}
```

Do not reintroduce old multi-level tiers such as `low`, `moderate`, `elevated`, or `critical`.

## Scripts

Useful scripts:

```bash
npm run build
npm run dev
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:predict-customers
```

`prisma:seed` creates deterministic synthetic customer profiles.

`prisma:predict-customers` calls Flask and replaces synthetic prediction values with real model output.

## Response Style

Follow the existing mixed contract carefully:

- HIMTI-style list responses may include `msg`, `data`, and `meta`.
- Some frontend endpoints intentionally return raw arrays or raw objects.
- Do not change response shapes without updating `../Churn_frontend/src/lib/api.ts`.

Current examples:

```ts
GET /api/customers -> { msg, data, meta }
GET /api/customers/:id -> CustomerWithName
GET /api/overview -> OverviewStats
GET /api/predictions/history -> PredictionHistoryPoint[]
GET /api/predictions/distribution -> RiskDistributionBucket[]
GET /api/analytics/by-contract -> ContractAggregate[]
```
