import { describe, test } from "node:test"
import assert from "node:assert"

function parseTimeToMinutes(time: string): number {
  if (!time || typeof time !== "string") return -1
  const parts = time.split(":")
  if (parts.length !== 2) return -1
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (isNaN(hours) || isNaN(minutes)) return -1
  return hours * 60 + minutes
}

function isInQuietHours(quietHoursRanges: Array<{ startMinutes: number; endMinutes: number }>): boolean {
  if (quietHoursRanges.length === 0) return false
  
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  for (const range of quietHoursRanges) {
    if (range.startMinutes < 0 || range.endMinutes < 0) continue
    
    if (range.startMinutes > range.endMinutes) {
      if (currentMinutes >= range.startMinutes || currentMinutes < range.endMinutes) {
        return true
      }
    } else {
      if (currentMinutes >= range.startMinutes && currentMinutes < range.endMinutes) {
        return true
      }
    }
  }
  
  return false
}

describe("parseTimeToMinutes", () => {
  test("parses valid time strings", () => {
    assert.strictEqual(parseTimeToMinutes("00:00"), 0)
    assert.strictEqual(parseTimeToMinutes("01:00"), 60)
    assert.strictEqual(parseTimeToMinutes("12:30"), 750)
    assert.strictEqual(parseTimeToMinutes("23:59"), 1439)
  })

  test("returns -1 for invalid input", () => {
    assert.strictEqual(parseTimeToMinutes(""), -1)
    assert.strictEqual(parseTimeToMinutes("invalid"), -1)
    assert.strictEqual(parseTimeToMinutes("25:00"), 1500) // doesn't validate range
    assert.strictEqual(parseTimeToMinutes(null as unknown as string), -1)
  })
})

describe("isInQuietHours", () => {
  test("returns false for empty ranges", () => {
    assert.strictEqual(isInQuietHours([]), false)
  })

  test("skips invalid ranges", () => {
    assert.strictEqual(isInQuietHours([{ startMinutes: -1, endMinutes: 60 }]), false)
  })
})

console.log("Running queue helper tests...")
