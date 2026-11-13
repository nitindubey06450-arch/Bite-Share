// server/middleware/role.js

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] role(s). Your role is '${req.user ? req.user.role : 'unauthenticated'}'.`,
        messageHi: `प्रतिबंधित: केवल [${allowedRoles.join(', ')}] भूमिकाओं के लिए अनुमति है।`
      });
    }
    next();
  };
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Admin privileges required',
      messageHi: 'पहुंच अस्वीकृत: व्यवस्थापक अनुमतियां आवश्यक हैं'
    });
  }
  next();
};

module.exports = { requireRole, requireAdmin };
