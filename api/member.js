// POST /api/member  { address, message, signature }  ->  { member: true|false }
//
// Vercel serverless function (root api/ folder, picked up with framework null).
// Logic lives in api/_lib/member-core.js; files starting with "_" are not
// deployed as their own functions.

import { checkMember, MemberError } from './_lib/member-core.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ member: false, error: 'Use POST.' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    const result = await checkMember(body, { host });
    return res.status(200).json(result);
  } catch (err) {
    const status = err instanceof MemberError ? err.status : 500;
    const error = err instanceof MemberError ? err.message : 'Something went wrong. Please try again.';
    return res.status(status).json({ member: false, error });
  }
}
