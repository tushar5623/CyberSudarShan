const { Router } = require('express');
const { lookupBreaches } = require('./provider');

function createBreachRouter(breachLimit) {
const router = Router();

router.get('/api/breach/:email', breachLimit, async (req, res) => {
    const outcome = await lookupBreaches(req.params.email);
    if (!outcome.ok) {
        console.error('Breach lookup provider request failed.');
        return res.status(outcome.reason === 'timeout' ? 504 : 502).json({
            error: 'Breach lookup unavailable. Please try again later.'
        });
    }
    return res.status(200).json(outcome.breaches.length > 0
        ? { safe: false, breaches: outcome.breaches }
        : { safe: true });
});
return router;
}

module.exports = { createBreachRouter };
