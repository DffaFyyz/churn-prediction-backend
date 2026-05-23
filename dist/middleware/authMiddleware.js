import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../utils/auth.js';
export const requireAuth = async (req, res, next) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
        return res.status(401).json({ msg: 'Unauthorized' });
    }
    res.locals.user = session.user;
    res.locals.session = session.session;
    next();
};
