export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);

  // Prisma unique constraint
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'Data sudah ada (unique constraint)',
      field: err.meta?.target,
    });
  }
  // Prisma not found
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Data tidak ditemukan' });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
