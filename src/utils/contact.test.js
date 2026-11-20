import assert from 'node:assert/strict'
import test from 'node:test'
import { formatDisplayPhone, getTelLink, getWhatsAppLink, normalizeIndianPhone } from './contact.js'

test('normalizes a valid Indian mobile number for call and WhatsApp links', () => {
  assert.equal(normalizeIndianPhone('98765 43210'), '919876543210')
})

test('accepts a formatted Indian country-code number', () => {
  assert.equal(normalizeIndianPhone('+91 98765-43210'), '919876543210')
})

test('accepts an 11-digit number with leading zero', () => {
  assert.equal(normalizeIndianPhone('09876543210'), '919876543210')
})

test('rejects demo placeholders and invalid numbers', () => {
  assert.equal(normalizeIndianPhone('demo-0001'), '')
  assert.equal(normalizeIndianPhone('1234567890'), '')
  assert.equal(normalizeIndianPhone('2025550123'), '')
})

test('formats phone number for display', () => {
  assert.equal(formatDisplayPhone('9876543210'), '+91 98765 43210')
})

test('generates tel and WhatsApp links', () => {
  assert.equal(getTelLink('9876543210'), 'tel:+919876543210')
  assert.equal(
    getWhatsAppLink('9876543210', 'Hello there'),
    'https://wa.me/919876543210?text=Hello%20there'
  )
})
