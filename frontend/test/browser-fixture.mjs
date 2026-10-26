// Local browser harness only. Run: node test/browser-fixture.mjs
// No application/backend config files or real services are used.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const origin = 'http://127.0.0.1:5188';
process.env.VITE_API_BASE_URL = origin;
let scenario = 'normal';
let sequence = 1;
let messages = [{ _id: 'welcome', sender: 'Moderator', message: 'Fixture welcome', timestamp: '2026-01-01T12:00:00Z' }];
const requests = [];
const scenarios = ['normal', 'empty', 'blog-error', 'news-error', 'chat-fail', 'chat-network',
  'chat-slow', 'chat-send-slow-fail', 'news-slow', 'breach-error', 'breach-timeout', 'breach-detected', 'auth-error'];
const blog = { _id: 'fixture-blog', title: 'Fixture blog', author: 'Fixture editor', content: 'Fixture blog details', date: '2026-01-01T12:00:00Z' };
const news = { _id: 'fixture-news', title: 'Fixture cyber news', type: 'News', summary: 'Fixture summary', fullDetails: 'Fixture full details', date: '2026-01-01T12:00:00Z' };

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  server: { host: '127.0.0.1', port: 5188, strictPort: true },
  plugins: [{
    name: 'local-browser-fixture',
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, origin);
        if (url.pathname === '/__fixture') {
          if (scenarios.includes(url.searchParams.get('scenario'))) scenario = url.searchParams.get('scenario');
          const requestedMember = url.searchParams.get('member');
          const member = ['valid', 'malformed', 'clear'].includes(requestedMember) ? requestedMember : null;
          const storage = member === 'valid' ? "localStorage.setItem('cyberUser',JSON.stringify({name:'Fixture Member',email:'member@example.invalid'}));"
            : member === 'malformed' ? "localStorage.setItem('cyberUser','{bad-json');"
              : member === 'clear' ? "localStorage.removeItem('cyberUser');" : '';
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<h1>Local browser fixture</h1><p>Scenario: ${scenario}</p><p>Member action: ${member || 'none'}</p>
            <nav>${scenarios.map(mode => `<p><a href="/__fixture?scenario=${mode}">${mode}</a></p>`).join('')}</nav>
            <p><a href="/__fixture?member=valid">Seed member</a></p><p><a href="/__fixture?member=malformed">Corrupt stored member</a></p>
            <p><a href="/__fixture?member=clear">Clear fixture member</a></p>
            <p><a href="/">Open home</a> <a href="/community">Open community</a> <a href="/blogs">Open blogs</a> <a href="/login">Open login</a></p>
            <h2>Observed mock requests</h2><pre>${JSON.stringify(requests.slice(-20), null, 2).replaceAll('<', '&lt;')}</pre><script>${storage}</script>`);
          return;
        }
        if (!url.pathname.startsWith('/api/')) return next();
        let text = '';
        for await (const chunk of req) text += chunk;
        const body = text ? JSON.parse(text) : {};
        const entry = { method: req.method, path: url.pathname, scenario, closedBeforeReply: false };
        requests.push(entry);
        res.on('close', () => { entry.closedBeforeReply = !res.writableEnded; });
        if ((scenario === 'chat-slow' && url.pathname === '/api/chat' && req.method === 'GET') ||
            (scenario === 'news-slow' && url.pathname === '/api/news')) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          if (res.destroyed) return;
        }
        if (url.pathname === '/api/chat') {
          if (req.method === 'GET') return json(res, 200, messages);
          if (scenario === 'chat-send-slow-fail') {
            await new Promise(resolve => setTimeout(resolve, 6000));
            if (res.destroyed) return;
            return json(res, 500, { success: false, message: 'Server error' });
          }
          if (scenario === 'chat-network') return res.destroy();
          if (scenario === 'chat-fail') return json(res, 500, { success: false, message: 'Server error' });
          messages = [...messages, { _id: `saved-${sequence++}`, sender: body.sender,
            message: body.message, timestamp: new Date().toISOString() }];
          return json(res, 201, { success: true, message: 'Message sent!' });
        }
        if (url.pathname === '/api/blogs' && req.method === 'GET') {
          return scenario === 'blog-error' ? json(res, 500, { error: 'Failed to fetch blogs' })
            : json(res, 200, scenario === 'empty' ? [] : [blog]);
        }
        if (url.pathname === '/api/news' && req.method === 'GET') {
          return scenario === 'news-error' ? json(res, 500, { success: false, message: 'Error fetching news' })
            : json(res, 200, scenario === 'empty' ? [] : [news]);
        }
        if (url.pathname.startsWith('/api/breach/')) {
          if (scenario === 'breach-timeout') await new Promise(resolve => setTimeout(resolve, 1000));
          if (scenario === 'breach-timeout' || scenario === 'breach-error') return json(res,
            scenario === 'breach-timeout' ? 504 : 502, { error: 'Breach lookup unavailable. Please try again later.' });
          return json(res, 200, scenario === 'breach-detected' ? { safe: false, breaches: ['Fixture breach'] } : { safe: true });
        }
        if (url.pathname.startsWith('/api/auth/')) {
          if (scenario === 'auth-error') return json(res, 400, { success: false, message: 'Invalid credentials!' });
          return json(res, url.pathname.endsWith('signup') ? 201 : 200, {
            success: true, message: 'Fixture success', user: { name: body.name || 'Fixture Member', email: body.email }
          });
        }
        if (url.pathname === '/api/verify-admin') return json(res, 200, { success: body.password === 'fixture-admin' });
        if (url.pathname === '/api/blogs') return json(res, 201, { ...blog, ...body });
        if (url.pathname.startsWith('/api/blogs/')) return json(res, 200, { success: true, message: 'Fixture mutation complete' });
        if (url.pathname === '/api/news') return json(res, 201, { success: true, message: 'Sent for verification!' });
        if (url.pathname === '/api/contact' || url.pathname === '/api/emergency') return json(res, 201, { message: 'Fixture saved' });
        return json(res, 404, { error: 'Unconfigured mock route' });
      });
    }
  }]
});
await server.listen();
console.log(`Local mocked browser fixture: ${origin}/__fixture`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  await server.close();
  process.exit(0);
});
