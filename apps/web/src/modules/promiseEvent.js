// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

export default function promiseEvent(emitter, event) {
    return new Promise(function (resolve) {
        emitter.addEventListener(event, resolve);
    });
};
