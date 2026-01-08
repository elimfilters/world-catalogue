module.exports = function debugRoutesController(req, res) {
    try {
        const routes = [];
        req.app._router.stack.forEach((middleware) => {
            if (middleware.route) {
                const methods = Object.keys(middleware.route.methods).join(",");
                routes.push({ path: middleware.route.path, methods });
            } else if (middleware.name === "router") {
                middleware.handle.stack.forEach((handler) => {
                    if (handler.route) {
                        const methods = Object.keys(handler.route.methods).join(",");
                        routes.push({ path: handler.route.path, methods });
                    }
                });
            }
        });
        return res.json({ success: true, routes });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
