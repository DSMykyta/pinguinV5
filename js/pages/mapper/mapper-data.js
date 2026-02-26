// js/pages/mapper/mapper-data.js

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                    MAPPER - DATA MANAGEMENT                              ║
 * ║                        (Re-export Hub)                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Центральний модуль для всіх data-операцій маппера.
 * Реекспортує функції з підмодулів — жоден імпортер не потребує змін.
 *
 * Підмодулі:
 *   mapper-data-helpers.js  — конфіг аркушів, hard delete, утиліти
 *   mapper-data-own.js      — Load + CRUD + Getters для власних сутностей
 *   mapper-data-mp.js       — Load MP сутностей + маппінги (load + getters)
 *   mapper-data-mappings.js — CRUD маппінгів, autoMap, batch операції
 */

export * from './mapper-data-helpers.js';
export * from './mapper-data-own.js';
export * from './mapper-data-mp.js';
export * from './mapper-data-mappings.js';
