export function normalizeIndianPhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1)
  } else if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2)
  } else if (digits.length === 13 && digits.startsWith('091')) {
    digits = digits.slice(3)
  }

  if (!/^[6-9]\d{9}$/.test(digits)) return ''
  return `91${digits}`
}

export function formatDisplayPhone(phone) {
  const normalized = normalizeIndianPhone(phone)
  if (!normalized || normalized.length !== 12) return phone || ''
  const number = normalized.slice(2)
  return `+91 ${number.slice(0, 5)} ${number.slice(5)}`
}

export function getWhatsAppLink(phone, message = '') {
  const normalized = normalizeIndianPhone(phone)
  if (!normalized) return ''
  const encodedText = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${normalized}${encodedText}`
}

export function getTelLink(phone) {
  const normalized = normalizeIndianPhone(phone)
  if (!normalized) return ''
  return `tel:+${normalized}`
}
