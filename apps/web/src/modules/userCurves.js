// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import Nexus from "nexusui";

import curveTables from "./curveTables.json";
import { userTable } from "./jsonSysex";
import { decodeTable } from "./presetFromSysex";
import { set, boppadPresets } from "./presetHandler";
import { isConnected, sendSysex } from "./midi";
import { save, remove } from "./storage";

// NexusUI's audio clock crashes Chromium (ScriptProcessorNode); we don't need audio.
Nexus.clock.stop();
Nexus.context.close();

let numberOfSliders = 128,
  allTables = [],
  saveAction = false,
  curveSelect = document.querySelector("#curveSelect"),
  selectedCurveIndex = 0,
  tableName = "User Table 1";

// TODO: allow default tables to load without boppad connected
const velocitycurves = new Nexus.Multislider("#velocitycurves", {
  size: [500, 200],
  numberOfSliders: numberOfSliders,
  min: 0,
  max: 127,
  step: 1,
  candycane: 1,
  smoothing: 1,
  mode: "bar",
  values: [...curveTables[Object.keys(curveTables)[0]]], // set default curve
});

// set multislider styles
Nexus.colors.accent = "#04aef0";
velocitycurves.colorize("fill", "#333");
velocitycurves.colorize("accent", "#00adef");

velocitycurves.element.style.opacity = 1;

velocitycurves.on("change", (e) => {
  if (velocitycurves.hasMoved) {
    // TODO: highlight save /revert buttons
    console.log("velocitycurves", velocitycurves.values);
  }
});

// request
$(document).on("modalcurvetableopen", () => {
  let tableNames = Object.keys(curveTables);

  saveAction = false;
  // reset user tables
  boppadPresets.usertables = [];

  // add buttons to modal. this doesn't need to happen everytime
  buildButtons(tableNames);

  if (isConnected()) {
    // request user tables
    $(document).trigger("requestusertables");
  } else {
    $(document).trigger("usertablesready");
    setTable(getTable("linear"), velocitycurves);
  }
});

// build
$(document).on("usertablesready", () => {
  console.log(">> user tables ready, building menu");

  let tableNames = Object.keys(curveTables);
  addDefaultTables(tableNames);
  buildMenu(boppadPresets.usertables);

  if (!isConnected()) return;

  if (!saveAction) {
    // load user table 1 on open
    setTable(getTable("User Table 1"), velocitycurves);
  } else {
    // select current user table on rebuild
    $("#curveSelect").val("User Table " + (selectedCurveIndex + 1));
  }
});

$(".modal.usertables").on("change", "select", function (e) {
  let table = e.target.selectedOptions[0].value;

  selectedCurveIndex = curveSelect.selectedIndex;

  tableName = "User Table " + (selectedCurveIndex + 1);

  setTable(getTable(table), velocitycurves);
});

function getCurrentTable(el) {
  return el.values.map((item) => Math.round(item));
}

function getTable(name) {
  console.log("gettable", name, boppadPresets.usertables);
  let tableObject = boppadPresets.usertables.find(
    (object) => object.name == name
  );
  return tableObject.table;
}

function setTable(array, ui) {
  ui.setAllSliders([...array]);
}

$(".modal").on("click", "button", function (e) {
  let action = e.target.dataset.action,
    tableAction = e.target.dataset.table,
    currentTable = getCurrentTable(velocitycurves),
    table = [];

  if (tableAction) {
    setTable(getTable(tableAction), velocitycurves);
  } else {
    switch (action) {
      case "save-curve":
        table = userTable(selectedCurveIndex + 1, currentTable);
        // send table
        sendSysex({ type: "table", item: table });
        // reset user tables
        boppadPresets.usertables = [];
        // save action
        saveAction = true;
        // rebuildTables
        $(document).trigger("requestusertables");
        // save to storage
        save(currentTable, false, "_boppadusertables_", tableName);
        break;
      case "reset-curve":
        setTable(getTable("linear"), velocitycurves);
        break;
    }
  }
});

function buildMenu(tables) {
  let tableMenu = $("#curveSelect"),
    tableOptions = Object.keys(tables)
      .filter((index) => tables[index].name.toLowerCase().includes("user"))
      .map(
        (index) =>
          '<option value="' +
          tables[index].name +
          '">' +
          tables[index].name +
          "</option>"
      );

  tableMenu.empty().append(tableOptions.join(""));
}

function addDefaultTables(tableNames) {
  // add factory curve tables
  tableNames.forEach((tableName) => {
    let tableObject = {
      name: tableName,
      table: curveTables[tableName],
    };

    boppadPresets.usertables.push(tableObject);
  });
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
