// Return validated entries or a redacted failure classification, never HTTP objects.
async function lookupBreaches(email) {
    const controller = new AbortController();
    // Bound the complete provider request, including JSON body consumption.
    const timeout = setTimeout(() => controller.abort(), 10000);
    timeout.unref?.();
    try {
        const response = await fetch(`https://api.xposedornot.com/v1/check-email/${email}`, {
            signal: controller.signal,
            redirect: 'error'
        });
        controller.signal.throwIfAborted();
        if (!(response.status >= 200 && response.status < 300)) {
            throw new Error('Provider HTTP failure');
        }

        const data = await response.json();
        controller.signal.throwIfAborted();
        if (data === null || typeof data !== 'object' || Array.isArray(data) ||
            !Object.hasOwn(data, 'breaches') || !Array.isArray(data.breaches) ||
            ['Error', 'error', 'errors'].some(key => Object.hasOwn(data, key)) ||
            (Object.hasOwn(data, 'status') && data.status !== 'success')) {
            throw new Error('Unexpected provider response');
        }
        const breachesArray = data.breaches.flat();
        if (!breachesArray.every(breach => typeof breach === 'string' && breach.trim().length > 0)) {
            throw new Error('Unexpected breach entries');
        }

        return { ok: true, breaches: breachesArray };
    } catch {
        return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'unavailable' };
    } finally {
        clearTimeout(timeout);
        controller.abort();
    }
}

module.exports = { lookupBreaches };
