/* Ambient declarations shared by the app and the Netlify Functions.
 *
 * The functions are Node code (they read process.env for the service-role key,
 * hash invitation tokens, and base64-encode Twilio credentials) but this is a
 * browser project without @types/node. The function unit tests import from
 * netlify/functions, which pulls those files into the TypeScript program — so
 * declare just the surface they use rather than pulling in a whole Node type
 * package. */
declare const process: {
  env: Record<string, string | undefined>
}

declare const Buffer: {
  from(input: string, encoding?: string): { toString(encoding: string): string }
}

declare module 'node:crypto' {
  export function randomBytes(size: number): { toString(encoding: string): string }
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: string): string }
  }
}
