// Utility functions

import { RESTART_NAMES } from './config.js';

/**
 * Format a number for display with appropriate suffix
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return Math.floor(num);
}

/**
 * Get restart button text based on restart count
 * @param {number} restartCount - Current restart count
 * @returns {object} Object with 'main' and 'sub' text properties
 */
export function getRestartButtonText(restartCount) {
    switch (restartCount) {
        case 0:
            // First restart
            return {
                main: 'Reignite Universe',
                sub: null
            };
        case 1:
            // Second restart
            return {
                main: 'Let there be light',
                sub: null
            };
        case 2:
            // Third restart - Kun Fayakun
            return {
                main: 'Kun Fayakun',
                sub: 'Be, and it is'
            };
        case 3:
            // Fourth restart - Fiat Lux
            return {
                main: 'Fiat Lux',
                sub: 'Let light be made'
            };
        default:
            // Fifth restart and beyond - random from list
            const randomIndex = Math.floor(Math.random() * RESTART_NAMES.length);
            const selected = RESTART_NAMES[randomIndex];
            return {
                main: selected.name,
                sub: selected.translation
            };
    }
}

/**
 * Convert HSL color values to hexadecimal color
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {number} Hexadecimal color value
 */
export function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255);
}
