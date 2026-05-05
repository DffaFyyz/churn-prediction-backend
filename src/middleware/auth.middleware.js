import jwt from 'jsonwebtoken';
import { ApiError } from './error.middleware.js';

export function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new ApiError(401, 'Token tidak ditemukan');
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token tidak valid atau sudah expired'));
    }
    next(err);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Tidak terautentikasi'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Anda tidak punya izin untuk aksi ini'));
    }
    next();
  };
}
