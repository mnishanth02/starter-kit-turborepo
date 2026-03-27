import { timingSafeEqual } from 'node:crypto';
import type { WebhookEvent } from '@clerk/backend';
import { db, projects, uploads } from '@starter/db';
import { ErrorCode } from '@starter/validation';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { apiError } from '../lib/errors';
import { deleteObject } from '../lib/storage';

const TOLERANCE_SECONDS = 5 * 60;

async function verifyClerkWebhook(
  rawBody: string,
  msgId: string | null,
  msgTimestamp: string | null,
  msgSignature: string | null,
  secret: string,
): Promise<boolean> {
  if (!msgId || !msgTimestamp || !msgSignature) return false;

  const ts = parseInt(msgTimestamp, 10);
  if (Number.isNaN(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) return false;

  const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const secretBytes = Buffer.from(secretBase64, 'base64');

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signedContent = `${msgId}.${msgTimestamp}.${rawBody}`;
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signedContent),
  );
  const computedSig = Buffer.from(signatureBuffer).toString('base64');
  const computedBuf = Buffer.from(computedSig);

  for (const part of msgSignature.split(' ')) {
    const comma = part.indexOf(',');
    if (comma === -1) continue;
    const version = part.slice(0, comma);
    const sig = part.slice(comma + 1);
    if (version !== 'v1' || !sig) continue;
    try {
      const sigBuf = Buffer.from(sig);
      if (sigBuf.length === computedBuf.length && timingSafeEqual(sigBuf, computedBuf)) {
        return true;
      }
    } catch {
      // length mismatch — not equal
    }
  }
  return false;
}

export const webhooksRoute = new Hono().post('/', async (c) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return apiError(c, ErrorCode.INTERNAL_ERROR, 'Webhook secret not configured');
  }

  const rawBody = await c.req.text();

  const valid = await verifyClerkWebhook(
    rawBody,
    c.req.header('svix-id') ?? null,
    c.req.header('svix-timestamp') ?? null,
    c.req.header('svix-signature') ?? null,
    webhookSecret,
  );

  if (!valid) {
    return apiError(c, ErrorCode.UNAUTHORIZED, 'Invalid signature');
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return apiError(c, ErrorCode.VALIDATION_ERROR, 'Invalid webhook payload');
  }

  if (event.type === 'user.deleted') {
    const userId = (event.data as { id?: string }).id;
    if (userId) {
      const userUploads = await db
        .select({ id: uploads.id, objectKey: uploads.objectKey })
        .from(uploads)
        .where(eq(uploads.userId, userId));

      for (const upload of userUploads) {
        try {
          await deleteObject(upload.objectKey);
        } catch {
          // best-effort: proceed to DB delete even if R2 is unavailable
        }
      }

      await db.delete(uploads).where(eq(uploads.userId, userId));
      await db.delete(projects).where(eq(projects.userId, userId));
    }
  }

  return c.json({ received: true });
});
