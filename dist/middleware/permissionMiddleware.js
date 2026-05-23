const rolePermissions = {
    CS_AGENT: [
        'view_customers',
        'manage_customers',
        'run_prediction',
        'view_predictions',
    ],
    MANAGER: [
        'view_customers',
        'manage_customers',
        'run_prediction',
        'view_predictions',
        'create_intervention',
        'view_analytics',
        'manage_risk_settings',
        'batch_upload_customers',
    ],
};
export const requirePermission = (permissionName) => {
    return async (_req, res, next) => {
        const user = res.locals.user;
        const role = user.role;
        if (!role || !rolePermissions[role]?.includes(permissionName)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have the permission to access this feature.',
            });
        }
        next();
    };
};
