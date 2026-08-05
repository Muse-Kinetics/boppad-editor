// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 KMI Music, Inc.

let $nameForm = $('.preset-name-form'),
		$nameField = $nameForm.find('input[type=text]'),
		$cancelBtn = $nameForm.find('.cancel'),
		$saveBtn = $nameForm.find('.save-preset'),
		name = ''

document.addEventListener("keydown", (e) => {
	if(e.which == 13) {
		$saveBtn.click() // if no name don't click
	}
	if(e.which == 27) $cancelBtn.click()
})

export default function(){
	$nameForm.addClass('open')
	$nameField.val('')
	$nameField.focus()

	document.body.dataset.prompt = 'open'

	return new Promise((resolve, reject) => {
		$saveBtn.on('click', () => {
			$nameForm.removeClass('open')
			name = $nameField.val()

			if(!!name.trim()){
				resolve(name)
				// $nameForm.removeClass('open')
				document.body.dataset.prompt = 'closed'
			} else {
				reject('>> submit:no name provided')
			}
		})

		$cancelBtn.on('click', () => {
			$nameForm.removeClass('open')
			document.body.dataset.prompt = 'closed'
			reject('>> cancel')

			$cancelBtn.off('click')
		})
	})
}
