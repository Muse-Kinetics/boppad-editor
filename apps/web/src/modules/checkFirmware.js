// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

import { getJSON } from './utilities'

let firmwareVersion = {current: 0, latest: 0},
		editorVersion = {current: 0, latest: 0},
		fetchData

export default function getCurrentVersion(response){
	let BETA = (globalThis.BOPPAD_BETA) ? 'Beta' : ''

	if (response) {
		firmwareVersion.current = globalThis.BOPPAD_FIRMWARE_VERSION = response
			.slice(15, 18)
			.join(".")
			.toString();
		editorVersion.current = globalThis.BOPPAD_EDITOR_VERSION;

		if (!firmwareVersion.latest) {
			if (navigator.onLine) {
				fetchData = fetch(
					`https://files.keithmcmillen.com/products/boppad/firmware/currentVersion${BETA}.json?${
						Math.random() * 2 ** 32
					}`,
					{ cache: "no-store" }
				).then((response) => response.json());
			} else {
				fetchData = getJSON(
					`firmware/currentVersionOffline${BETA}.json?${
						Math.random() * 2 ** 32
					}`
				);
			}

			fetchData
				.then((data) => {
					firmwareVersion.latest = data.firmware.version;
					editorVersion.latest = data.editor.version;
					
					$(document).trigger("firmwareeditorchecked", [
						firmwareVersion,
						editorVersion,
					]);
				})
				.catch((err) => {
					console.error("Could not retrieve the requested file ", err);
				});
		} else {
			$(document).trigger("firmwareeditorchecked", [
				firmwareVersion,
				editorVersion,
			]);
		}
	} else {
		console.error("Could not get a response from the device.");
	}
}
