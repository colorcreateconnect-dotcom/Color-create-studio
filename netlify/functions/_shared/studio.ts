/* Naming a one-person studio.
 *
 * An independent contractor starting their own book gets an organization of
 * their own. They can name it, but they should not have to — most people
 * signing up on a phone will leave the field alone, and the app has to put
 * something on the header either way. */

/** Longest studio name we'll store. Long enough for a real business name,
 *  short enough that it can't be used to stuff the header. */
export const MAX_STUDIO_NAME = 80

/** What to call their studio: what they typed, else their own name, else
 *  something plain. Never blank, never "Untitled". */
export function studioNameFor(typed: unknown, personName: unknown): string {
  const t = clean(typed)
  if (t) return t
  const p = clean(personName)
  return p ? `${p}’s housekeeping` : 'My housekeeping'
}

/* Only a string is a name. The body is JSON from the browser, so `studioName`
   can arrive as a number, a boolean or an object; `String(0)` is "0", which is
   truthy and would end up on the header of a real business. */
function clean(x: unknown): string {
  if (typeof x !== 'string') return ''
  return x.replace(/\s+/g, ' ').trim().slice(0, MAX_STUDIO_NAME).trim()
}
