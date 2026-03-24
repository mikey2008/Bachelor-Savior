'use strict';

/**
 * requireOwnership middleware factory
 * ────────────────────────────────────
 * Prevents IDOR (Insecure Direct Object Reference) by verifying
 * that the resource being accessed belongs to the authenticated user.
 *
 * Usage in a route:
 *   router.get('/:id', authenticate, requireOwnership(getRecipeById), handler);
 *
 * @param {Function} getResource - fn(id) that returns the DB row (must have .user_id)
 */
module.exports = function requireOwnership(getResource) {
  return function (req, res, next) {
    const resourceId = parseInt(req.params.id, 10);

    if (isNaN(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID.' });
    }

    const resource = getResource(resourceId);

    if (!resource) {
      // Return 404 so attackers cannot enumerate valid IDs
      return res.status(404).json({ error: 'Resource not found.' });
    }

    if (resource.user_id !== req.user.id) {
      // 403 Forbidden — caller is authenticated but does not own this resource
      return res.status(403).json({ error: 'Forbidden.' });
    }

    // Attach resource to request so the route handler doesn't need to re-fetch
    req.resource = resource;
    next();
  };
};
