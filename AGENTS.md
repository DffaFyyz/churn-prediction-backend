# Retentio Backend Rules

This is the main Express backend for Retentio, a churn prediction CRM for telco companies.

Reference architecture:
Use ../HIMTI-Internal-Backend as the architecture reference.

Follow its structure:
- src/features/<featureName>
- featureController.ts
- featureService.ts
- featureRepository.ts
- featureRoutes.ts
- featureSchema.ts
- featureTypes.ts
- src/routes/routes.ts as the route aggregator
- src/middleware/authMiddleware.ts
- src/middleware/permissionMiddleware.ts
- src/middleware/errorMiddleware.ts
- src/utils/auth.ts for BetterAuth

Do not copy HIMTI business logic.
Only copy the architecture, naming style, error handling style, Prisma style, Zod style, and route organization.

Tech stack:
- Express
- TypeScript
- Prisma
- PostgreSQL
- BetterAuth
- Zod
- CORS
- Express rate limit if needed

Frontend contract:
Read ../Churn_frontend/src/lib/api.ts and ../Churn_frontend/src/types/index.ts.
The React frontend talks only to this Express backend.

Required frontend endpoints:
- GET /api/customers
- GET /api/customers/:id
- GET /api/overview
- GET /api/predictions/history
- GET /api/predictions/distribution
- GET /api/analytics/by-contract

ML service contract:
Read ../churn-ml-service/app.py.
The Flask service exposes POST /predict.
It receives preprocessed customer feature JSON.
It returns churn_probability, risk_level, and top_factors.

Important:
Do not send raw customer rows directly to Flask.
Create telcoFeatureMapper.ts to convert database customer fields into the exact model feature JSON.

The Flask service is thin:
- no auth
- no database
- no business logic

Express handles:
- auth
- RBAC
- database
- prediction logging
- risk tier calculation
- frontend response formatting

RBAC:
Use the HIMTI permission middleware pattern.
Create roles:
- CS_AGENT
- MANAGER

Suggested permissions:
- view_customers
- manage_customers
- run_prediction
- view_predictions
- create_intervention
- view_analytics
- manage_risk_settings
- batch_upload_customers

Controller rule:
Controllers should stay thin.
Validation happens with Zod schemas.
Business logic belongs in services.
Database access belongs in repositories.

Response style:
Follow the HIMTI style:
- success response uses msg: "success"
- list response may include data and meta
- errors go through globalErrorHandler where possible
