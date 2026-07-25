/* The Kee Method™ template engine — the method is DATA, not hardcoded screens.
 * A Property references a base Edition; per-property overrides layer that home's
 * standard on top. A Job instantiates the template into concrete, completable
 * steps (with the photo-proof flags). This mirrors the DB seed so it also works
 * offline / in the mock. */

export interface Step { ord: number; text: string; photoRequired: boolean; productRef?: string }
export interface Phase { ord: number; title: string; steps: Step[] }
export interface Edition { type: 'vacation_rental' | 'luxury_home'; name: string; phases: Phase[] }

/** Vacation Rental Edition — 26 steps, verbatim. The 4 photo steps are the proof. */
export const VACATION_RENTAL_EDITION: Edition = {
  type: 'vacation_rental',
  name: 'Vacation Rental Edition',
  phases: [
    { ord: 1, title: 'PRE-CLEAN WALKTHROUGH', steps: [
      { ord: 1, text: 'Notify host upon arrival', photoRequired: false },
      { ord: 2, text: 'Check under beds, in drawers, couches & closets for left-behind items', photoRequired: false },
      { ord: 3, text: 'Check inside fridge, oven & microwave for food items', photoRequired: false },
      { ord: 4, text: 'Inspect overall property condition & cleanliness level', photoRequired: false },
      { ord: 5, text: 'Report missing or damaged items to host immediately', photoRequired: false },
      { ord: 6, text: "Take 'before' photos for documentation", photoRequired: true },
    ] },
    { ord: 2, title: 'LAUNDRY PROCESS', steps: [
      { ord: 1, text: 'Strip all beds & begin first laundry load', photoRequired: false },
      { ord: 2, text: 'Sort into three loads: sheets / pillowcases+duvets / towels', photoRequired: false },
      { ord: 3, text: 'Start the wash BEFORE beginning cleaning tasks', photoRequired: false },
      { ord: 4, text: 'Steam sheets & pillowcases for a crisp finish', photoRequired: false },
      { ord: 5, text: 'Fold & stage towels to Airbnb presentation standard', photoRequired: false },
    ] },
    { ord: 3, title: 'CLEANING ORDER', steps: [
      { ord: 1, text: 'Bathrooms FIRST — toilets, tubs, sinks, mirrors, fixtures', photoRequired: false },
      { ord: 2, text: 'Sanitize high-touch surfaces', photoRequired: false },
      { ord: 3, text: 'Dust high & low; clean bedrooms incl. nightstands & under beds', photoRequired: false },
      { ord: 4, text: 'Make beds with fresh linens, wrinkle-free', photoRequired: true },
      { ord: 5, text: 'Clean & disinfect kitchen surfaces, sink & appliances', photoRequired: false },
      { ord: 6, text: 'Wipe dining table, chairs & living-room surfaces', photoRequired: false },
      { ord: 7, text: 'Vacuum & mop floors LAST', photoRequired: false },
    ] },
    { ord: 4, title: 'RESTOCKING & INVENTORY', steps: [
      { ord: 1, text: 'Refill toiletries', photoRequired: false },
      { ord: 2, text: 'Ensure clean towels, bedding & kitchen essentials stocked', photoRequired: false },
      { ord: 3, text: 'Restage unit to match listing photos', photoRequired: true },
      { ord: 4, text: 'Note missing/broken items to replace (adds to Supplies)', photoRequired: false },
    ] },
    { ord: 5, title: 'FINAL WALKTHROUGH & HOST', steps: [
      { ord: 1, text: 'Final check of all rooms', photoRequired: false },
      { ord: 2, text: "Take 'after' photos for quality assurance", photoRequired: true },
      { ord: 3, text: 'Lock doors, turn off lights, confirm unit security', photoRequired: false },
      { ord: 4, text: 'Set thermostat to suggested degrees', photoRequired: false },
    ] },
  ],
}

export interface PropertyOverride { note: string }

export interface JobStepInstance {
  ord: number
  phaseTitle: string
  text: string
  photoRequired: boolean
  completed: boolean
  photoKey?: string
}

/** Instantiate an edition (with a home's standing overrides) into job steps. */
export function instantiateJob(edition: Edition, _overrides: PropertyOverride[] = []): JobStepInstance[] {
  const out: JobStepInstance[] = []
  let ord = 0
  for (const phase of edition.phases) {
    for (const step of phase.steps) {
      out.push({ ord: ++ord, phaseTitle: phase.title, text: step.text, photoRequired: step.photoRequired, completed: false })
    }
  }
  return out
}

export function stepCount(edition: Edition): number {
  return edition.phases.reduce((n, p) => n + p.steps.length, 0)
}
export function photoStepCount(edition: Edition): number {
  return edition.phases.reduce((n, p) => n + p.steps.filter((s) => s.photoRequired).length, 0)
}
