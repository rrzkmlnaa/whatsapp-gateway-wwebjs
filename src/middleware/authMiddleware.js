const authorize = (roles = [], statuses = ['ACTIVE']) => {
  return (req, res, next) => {
    const user = req.user; // Assumes user is already authenticated and available in req.user

    // Check if user role is allowed
    if (!roles.includes(user.role)) {
      return res
        .status(403)
        .json({ error: 'Forbidden. You do not have the required role.' });
    }

    // Check if user status is allowed
    if (!statuses.includes(user.status)) {
      return res
        .status(403)
        .json({ error: `Your account is ${user.status}. Access denied.` });
    }

    next(); // Proceed if authorized
  };
};

module.exports = authorize;
