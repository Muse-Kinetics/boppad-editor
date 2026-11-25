// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import CurveSlider from "./curveSlider";

import curveTables from "./curveTables.json";
import { userTable } from "./jsonSysex";
import { decodeTable } from "./presetFromSysex";
import { set, boppadPresets } from "./presetHandler";
import { isConnected, sendSysex } from "./midi";
import * as library from "./curveLibrary";

let numberOfSliders = 128,
  curveSelect = document.querySelector("#curveSelect"),
  curveName = document.querySelector("#curveName"),
  importInput = document.querySelector("#curveImport");

const velocitycurves = new CurveSlider(document.querySelector("#velocitycurves"), {
  count: numberOfSliders,
});
velocitycurves.setAllSliders(curveTables.linear);

$(document).on("modalcurvetableopen", () => {
  library.migrateLegacy();
  buildButtons(Object.keys(curveTables));
  boppadPresets.usertables = [];
  buildMenu();
  setDeviceControls(isConnected());

  if (isConnected()) {
    $(document).trigger("requestusertables");
  } else {
    setTable(curveTables.linear);
  }
});

// fired by presetHandler once all four user tables have arrived from the device
$(document).on("usertablesready", () => {
  if (!isConnected()) return;
  buildMenu("device:1");
  loadSelected();
});

$(curveSelect).on("change", loadSelected);

$(importInput).on("change", () => {
  const file = importInput.files[0];
  if (!file) return;

  file.text().then((text) => {
    let count = 0;
    try {
      count = library.importData(JSON.parse(text));
    } catch (e) {
      console.warn("curve import: not a valid JSON file", e);
    }
    console.log(">> imported", count, "curves");
    buildMenu(curveSelect.value);
    importInput.value = "";
  });
});

$(".usercurves").on("click", "button", function (e) {
  const action = e.target.dataset.action,
    factoryTable = e.target.dataset.table;

  if (factoryTable) {
    setTable(curveTables[factoryTable]);
    curveSelect.selectedIndex = -1;
    $(".usercurves [data-action=delete-library]").prop("disabled", true);
    return;
  }
  if (e.target.dataset.slot) {
    setDestination(e.target.dataset.slot);
    return;
  }

  switch (action) {
    case "send-curve":
      sendCurrentToSlot();
      break;
    case "reset-curve":
      setTable(curveTables.linear);
      curveSelect.selectedIndex = -1;
      $(".usercurves [data-action=delete-library]").prop("disabled", true);
      break;
    case "save-library":
      saveToLibrary();
      break;
    case "delete-library":
      if (curveSelect.value.startsWith("user:")) library.remove(curveSelect.value.slice(5));
      buildMenu();
      break;
    case "import-library":
      importInput.click();
      break;
    case "export-library":
      library.exportFile();
      break;
  }
});

function getCurrentTable() {
  return velocitycurves.values.slice();
}

function setTable(array) {
  velocitycurves.setAllSliders([...array]);
}

function slotName(slot) {
  return "User Table " + slot;
}

function getSlot(slot) {
  return boppadPresets.usertables.find((table) => table.name === slotName(slot));
}

function getDestination() {
  return $(".usercurves [data-slot].active").data("slot");
}

function setDestination(slot) {
  $(".usercurves [data-slot]").removeClass("active").filter(`[data-slot=${slot}]`).addClass("active");
}

// option values are "user:<name>" for saved curves and "device:<slot>" for the BopPad's tables
function loadSelected() {
  const [type, key] = curveSelect.value.split(/:(.*)/);

  if (type === "user") {
    const curve = library.get(key);
    if (curve) {
      setTable(curve.table);
      curveName.value = curve.name;
    }
  } else if (type === "device") {
    const slot = getSlot(key);
    if (slot) setTable(slot.table);
    setDestination(key);
  }
  $(".usercurves [data-action=delete-library]").prop("disabled", type !== "user");
}

function sendCurrentToSlot() {
  if (!isConnected()) return;

  const slot = getDestination(),
    table = getCurrentTable(),
    existing = getSlot(slot);

  sendSysex({ type: "table", item: userTable(slot, table) });

  if (existing) existing.table = table;
  else boppadPresets.usertables.push({ name: slotName(slot), table });
}

function saveToLibrary() {
  const name = curveName.value.trim();
  if (!name) {
    curveName.focus();
    return;
  }

  library.save(name, getCurrentTable());
  buildMenu("user:" + name);
}

function buildMenu(selected = "") {
  const curves = library.list(),
    slots = [1, 2, 3, 4].filter((slot) => getSlot(slot)),
    option = (text, value) => '<option value="' + value + '">' + text + "</option>";

  let html = "";
  if (curves.length) html += '<optgroup label="User">' + curves.map(({ name }) => option(name, "user:" + name)).join("") + "</optgroup>";
  if (slots.length) html += '<optgroup label="Device">' + slots.map((slot) => option(slotName(slot), "device:" + slot)).join("") + "</optgroup>";

  curveSelect.innerHTML = html;
  curveSelect.value = selected;
  curveSelect.disabled = !html;

  $(".usercurves [data-action=delete-library]").prop("disabled", !selected.startsWith("user:"));
  $(".usercurves [data-action=export-library]").prop("disabled", !curves.length);
}

function setDeviceControls(connected) {
  $(".usercurves .destinations button").prop("disabled", !connected);
}

function buildButtons(names) {
  let tableButtonContainer = $(".usercurves").find(".table-buttons"),
    tableButtons = names.map(
      (name) =>
        '<button class="btn" data-table="' + name + '">' + name + "</button>"
    );

  tableButtonContainer.empty().append(tableButtons.join(""));
}

export function sendUserTables(tables) {
  tables.forEach((table, index) => {
    let usertable = userTable(index + 1, table);
    sendSysex({ type: "table", item: usertable });
  });
}

export function setUserTable(data) {
  set("usertables", decodeTable(data));
}
