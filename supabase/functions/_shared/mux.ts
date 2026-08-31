// Cliente Mux mínimo, via API HTTP oficial.
// Não usamos SDK Node para não depender de compatibilidade com Deno.
// Docs: https://docs.mux.com/api-reference

const MUX_API = 'https://api.mux.com'

function basicAuth(): string {
  const id = Deno.env.get('MUX_TOKEN_ID')
  const secret = Deno.env.get('MUX_TOKEN_SECRET')
  if (!id || !secret) throw new Error('MUX_TOKEN_ID/MUX_TOKEN_SECRET ausentes')
  return 'Basic ' + btoa(`${id}:${secret}`)
}

export class MuxError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function muxFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${MUX_API}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (res.status === 204) return null

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const detail =
      body?.error?.messages?.join(' ') ??
      body?.error?.type ??
      `HTTP ${res.status}`
    throw new MuxError(detail, res.status)
  }
  return body
}

/** Cria um Direct Upload. O browser envia o arquivo direto para a URL retornada. */
export async function createDirectUpload(opts: {
  corsOrigin: string
  passthrough: string
}): Promise<{ id: string; url: string }> {
  const body = await muxFetch('/video/v1/uploads', {
    method: 'POST',
    body: JSON.stringify({
      cors_origin: opts.corsOrigin,
      new_asset_settings: {
        playback_policy: ['signed'],
        video_quality: 'basic',
        passthrough: opts.passthrough,
      },
    }),
  })
  return { id: body.data.id, url: body.data.url }
}

export async function getUpload(uploadId: string) {
  const body = await muxFetch(`/video/v1/uploads/${uploadId}`)
  return body?.data ?? null
}

export async function deleteAsset(assetId: string): Promise<void> {
  try {
    await muxFetch(`/video/v1/assets/${assetId}`, { method: 'DELETE' })
  } catch (err) {
    // 404 = já não existe no Mux. Não é erro para o nosso fluxo.
    if (err instanceof MuxError && err.status === 404) return
    throw err
  }
}

export async function cancelUpload(uploadId: string): Promise<void> {
  try {
    await muxFetch(`/video/v1/uploads/${uploadId}/cancel`, { method: 'PUT' })
  } catch {
    // upload já concluído ou inexistente — segue o fluxo
  }
}

// ---------------------------------------------------------------------
// Signed playback token (JWT RS256)
// Docs: https://docs.mux.com/guides/secure-video-playback
// ---------------------------------------------------------------------

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(body)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** Comprimento em DER: curto (<128) em 1 byte, senão 0x80|n seguido de n bytes. */
function derLength(n: number): number[] {
  if (n < 0x80) return [n]
  const bytes: number[] = []
  let v = n
  while (v > 0) {
    bytes.unshift(v & 0xff)
    v >>= 8
  }
  return [0x80 | bytes.length, ...bytes]
}

/**
 * O Mux entrega a chave de assinatura em PKCS#1 (`BEGIN RSA PRIVATE KEY`),
 * mas WebCrypto só importa PKCS#8 (`BEGIN PRIVATE KEY`). A conversão é
 * puramente estrutural: embrulhamos o RSAPrivateKey num PrivateKeyInfo.
 *
 *   SEQUENCE {
 *     INTEGER 0                                    -- versão
 *     SEQUENCE { OID 1.2.840.113549.1.1.1, NULL }  -- rsaEncryption
 *     OCTET STRING { <PKCS#1 DER> }
 *   }
 */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = [0x02, 0x01, 0x00]
  const rsaAlgorithm = [
    0x30, 0x0d,
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
    0x05, 0x00,
  ]
  const octetString = [0x04, ...derLength(pkcs1.length), ...pkcs1]
  const inner = [...version, ...rsaAlgorithm, ...octetString]
  return new Uint8Array([0x30, ...derLength(inner.length), ...inner])
}

let cachedKey: CryptoKey | null = null

async function signingKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const raw = Deno.env.get('MUX_SIGNING_PRIVATE_KEY')
  if (!raw) throw new Error('MUX_SIGNING_PRIVATE_KEY ausente')

  // O Mux entrega a chave em base64. Aceitamos também o PEM cru.
  const pem = raw.includes('-----BEGIN') ? raw : atob(raw)
  const der = pemToDer(pem)

  const looksPkcs1 = /BEGIN RSA PRIVATE KEY/.test(pem)
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

  try {
    cachedKey = await crypto.subtle.importKey(
      'pkcs8',
      looksPkcs1 ? pkcs1ToPkcs8(der) : der,
      algorithm,
      false,
      ['sign'],
    )
  } catch (err) {
    // Cabeçalho ausente ou mentiroso: tenta o outro formato antes de desistir.
    try {
      cachedKey = await crypto.subtle.importKey(
        'pkcs8',
        looksPkcs1 ? der : pkcs1ToPkcs8(der),
        algorithm,
        false,
        ['sign'],
      )
    } catch {
      throw new Error(
        `MUX_SIGNING_PRIVATE_KEY não pôde ser importada (nem PKCS#8 nem PKCS#1): ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  return cachedKey
}

/**
 * Gera um token de playback de curta duração.
 * `audience`: 'v' vídeo, 't' thumbnail, 's' storyboard.
 */
export async function signPlaybackToken(
  playbackId: string,
  audience: 'v' | 't' | 's',
  expiresInSeconds = 3600,
): Promise<string> {
  const keyId = Deno.env.get('MUX_SIGNING_KEY_ID')
  if (!keyId) throw new Error('MUX_SIGNING_KEY_ID ausente')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT', kid: keyId }
  const payload = {
    sub: playbackId,
    aud: audience,
    exp: now + expiresInSeconds,
    kid: keyId,
  }

  const enc = new TextEncoder()
  const signingInput = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(
    enc.encode(JSON.stringify(payload)),
  )}`

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    await signingKey(),
    enc.encode(signingInput),
  )

  return `${signingInput}.${b64url(new Uint8Array(sig))}`
}

// ---------------------------------------------------------------------
// Verificação de assinatura do webhook
// header: mux-signature: t=<timestamp>,v1=<hmac-sha256>
// ---------------------------------------------------------------------
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
): Promise<boolean> {
  const secret = Deno.env.get('MUX_WEBHOOK_SECRET')
  if (!secret || !signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
    }),
  ) as Record<string, string>

  const timestamp = parts['t']
  const expected = parts['v1']
  if (!timestamp || !expected) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > toleranceSeconds) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(`${timestamp}.${rawBody}`),
  )

  const actual = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // comparação em tempo constante
  if (actual.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
