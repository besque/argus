const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    success: false,
    error: message
  });
};

module.exports = errorHandler;