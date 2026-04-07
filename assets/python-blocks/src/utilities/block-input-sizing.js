export function getBlockInputSize(value, placeholder = '', minimum = 4, maximum = 40) {
    const text = value === null || value === undefined || value === ''
        ? String(placeholder || '')
        : String(value)

    return Math.min(maximum, Math.max(minimum, text.length + 1))
}