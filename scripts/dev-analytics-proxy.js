#!/usr/bin/env node
// Simple development analytics proxy to bypass CORS.
// Usage: node scripts/dev-analytics-proxy.js --target https://analytics.entu.dev --port 5055
// Then set window.ANALYTICS_ENDPOINT = 'http://localhost:5055' (demo UI already allows override)

const http = require('http')
const https = require('https')
const { URL } = require('url')

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { port: 5055, target: 'https://analytics.entu.dev' }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--port' || a === '-p') && args[i+1]) opts.port = parseInt(args[++i], 10)
    else if ((a === '--target' || a === '-t') && args[i+1]) opts.target = args[++i].replace(/\/$/, '')
  }
  return opts
}

const { port, target } = parseArgs()
const targetUrl = new URL(target)

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5500')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

const VERBOSE = process.env.ANALYTICS_PROXY_VERBOSE === '1'

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.writeHead(204)
    return res.end()
  }
  if (req.url !== '/api/track') {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    return res.end('Not Found')
  }
  let body = []
  req.on('data', chunk => body.push(chunk))
  req.on('end', () => {
    const payload = Buffer.concat(body)
    if (VERBOSE) {
      try { console.log('[DevAnalyticsProxy] Incoming payload:', payload.toString().slice(0,400)) } catch {}
    }
    const options = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: '/api/track',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    }
    const client = (targetUrl.protocol === 'https:' ? https : http)
    const proxyReq = client.request(options, proxyRes => {
      let upstreamBody = []
      proxyRes.on('data', chunk => upstreamBody.push(chunk))
      proxyRes.on('end', () => {
        const upstreamText = Buffer.concat(upstreamBody).toString()
        if (VERBOSE) console.log('[DevAnalyticsProxy] Upstream status', proxyRes.statusCode, 'body:', upstreamText.slice(0,400))
        setCors(res)
        res.writeHead(proxyRes.statusCode || 204, { 'Content-Type': 'application/json' })
        res.end(upstreamText || '')
      })
    })
    proxyReq.on('error', err => {
      setCors(res)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Proxy Error', detail: err.message }))
    })
    proxyReq.write(payload)
    proxyReq.end()
  })
})

server.listen(port, () => {
  console.log(`[DevAnalyticsProxy] Listening on http://localhost:${port} → ${target}/api/track`)
  console.log('Set ANALYTICS_ENDPOINT to http://localhost:'+port+' to use the proxy.')
  if (VERBOSE) console.log('[DevAnalyticsProxy] Verbose logging enabled (set ANALYTICS_PROXY_VERBOSE=1)')
})
