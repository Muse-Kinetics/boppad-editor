// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

// Local library of named velocity curves, kept in localStorage so it works offline.
const PREFIX = "_boppadcurve_";
const LEGACY_PREFIX = "_boppadusertables_";
const MIGRATED_KEY = "_boppadcurves_migrated";

export function isValidTable(table) {
  return (
    Array.isArray(table) &&
    table.length === 128 &&
    table.every((v) => Number.isInteger(v) && v >= 0 && v <= 127)
  );
}

export function list() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .map((key) => localStorage.getObject(key))
    .filter((curve) => curve && isValidTable(curve.table))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function get(name) {
  return localStorage.getObject(PREFIX + name);
}

export function save(name, table) {
  localStorage.setObject(PREFIX + name, { name, table });
}

export function remove(name) {
  localStorage.removeItem(PREFIX + name);
}

function uniqueName(name) {
  let candidate = name, n = 2;
  while (get(candidate)) candidate = `${name} (${n++})`;
  return candidate;
}

export function exportFile() {
  const data = { type: "boppad-curves", version: 1, curves: list() };
  const a = document.createElement("a");
  a.setAttribute("href", "data:application/json;charset=utf8," + encodeURIComponent(JSON.stringify(data, null, 2)));
  a.setAttribute("download", "boppad_curves.json");
  a.click();
}

// Returns how many curves were added. Exact duplicates are skipped, name clashes get a suffix.
export function importData(data) {
  const curves = data && data.type === "boppad-curves" && Array.isArray(data.curves) ? data.curves : [];
  let count = 0;

  curves.forEach((curve) => {
    if (!curve || typeof curve.name !== "string" || !curve.name.trim() || !isValidTable(curve.table)) return;

    const name = curve.name.trim().slice(0, 32), existing = get(name);
    if (existing && existing.table.join() === curve.table.join()) return;

    save(uniqueName(name), curve.table);
    count++;
  });

  return count;
}

// Older versions stored each sent slot as a bare array under _boppadusertables_User_Table_N.
export function migrateLegacy() {
  if (localStorage.getItem(MIGRATED_KEY)) return;

  Object.keys(localStorage)
    .filter((key) => key.startsWith(LEGACY_PREFIX))
    .forEach((key) => {
      let table;
      try {
        table = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        return;
      }
      if (isValidTable(table)) {
        save(uniqueName(key.slice(LEGACY_PREFIX.length).replace(/_/g, " ") + " (saved)"), table);
      }
    });

  localStorage.setItem(MIGRATED_KEY, "1");
}
