function initialize(video, menu, rateBtn) {
	const MAX_RATE = 4
	const INCREMENT = 0.25

	function getPlaybackRate(event) {
		if (event.type === 'click') {
			let classList = [
				'fx',
				'lecture__item__link__name',
				'mr5',
				'lecture__item__link',
				'udi-play',
				'udi-next',
				'btn__label',
				'continue-button--btn__label--3H0BR',
				'continue-button--responsive--3c3TI',
			]

			let videoChanged = classList.some(string => {
				if (event.target.classList.contains(string)) return true
			})
			// if the user selected a new video or clicked continue, run setup for next video
			if (videoChanged) observeDocument()
			else return
		}

		// if the video ended on its own, run setup for next video
		if (event.type === 'ended') observeDocument()

		chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
			if (event.type === 'loadeddata') {
				// gotta love algebra
				let itemIndexPosition = (obj.udemy_playback_rate - MAX_RATE) / INCREMENT / -1
				setMenuItemsHTML(menu.children[itemIndexPosition])
			}
			video.playbackRate = obj.udemy_playback_rate
		})
	}

	function setPlaybackRate(rate, event) {
		// increment speed if rate button clicked
		if (rate === INCREMENT) {
			let newRate = rate
			chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
				newRate = obj.udemy_playback_rate + INCREMENT
				if (newRate > MAX_RATE) newRate = 0.5
				let itemIndexPosition = (newRate - MAX_RATE) / INCREMENT / -1
				setMenuItemsHTML(menu.children[itemIndexPosition])
				chrome.storage.sync.set({ udemy_playback_rate: newRate }, () => {
					video.playbackRate = newRate
				})
			})
		} else
			chrome.storage.sync.set({ udemy_playback_rate: rate }, () => {
				video.playbackRate = rate
			})
	}

	// following the format on Udemy
	// may remove child span in future
	function populateItems() {
		menu.innerHTML = `
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">4x <span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">3.75x <span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">3.5x <span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">3.25x <span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">3x <span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">2.75x <span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">2.5x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">2.25x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">2x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">1.75x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">1.5x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">1.25x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">1x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">0.75x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">0.5x<span class="vjs-control-text"> </span></li>
	`
		Object.keys(menu.children).forEach((val, index) => {
			let element = menu.children[val]

			element.addEventListener('click', () => {
				setPlaybackRate(MAX_RATE - index * INCREMENT)
				setMenuItemsHTML(element)
			})
		})
	}

	function setMenuItemsHTML(element) {
		Object.keys(menu.children).forEach(val => {
			let el = menu.children[val]
			el.setAttribute('aria-checked', false)
			el.setAttribute('title', '')
			el.children[0].innerHTML = ''
			el.style.background = ''
		})
		element.setAttribute('aria-checked', true)
		element.setAttribute('title', ', selected')
		element.children[0].innerHTML = ', selected'
		element.style.background = 'rgb(236, 82, 82)'
	}

	video.addEventListener('loadeddata', getPlaybackRate)
	video.addEventListener('play', getPlaybackRate)
	video.addEventListener('ended', getPlaybackRate)

	rateBtn.addEventListener('click', () => {
		setPlaybackRate(INCREMENT)
	})

	// is used to check if new video selected or continue button clicked
	document.addEventListener('click', getPlaybackRate)
	populateItems()
}

let observerCompleted = false

let Observer = new MutationObserver((mutations, observer) => {
	mutations.forEach(() => {
		let videoElement = document.getElementsByTagName('video')[0]
		let menuElement = document.querySelector(
			'div.vjs-control-bar.hide-when-user-inactive.player-controls > div.playback-controls > div > div.vjs-menu > ul',
		)
		let rateButton = document.getElementsByClassName('vjs-playback-rate-value')[0]
		if (videoElement && menuElement && rateButton && !observerCompleted) {
			observerCompleted = true
			observer.disconnect()
			initialize(videoElement, menuElement, rateButton)
		}
	})
})

function observeDocument() {
	let videoElement = document.getElementsByTagName('video')[0]
	let menuElement = document.querySelector(
		'div.vjs-control-bar.hide-when-user-inactive.player-controls > div.playback-controls > div > div.vjs-menu > ul',
	)
	let rateButton = document.getElementsByClassName('vjs-playback-rate-value')[0]
	// if not initial page load manually remove elements so we can use mutation observer on video change
	if (videoElement) videoElement.remove()
	if (menuElement) menuElement.remove()
	if (rateButton) rateButton.remove()

	observerCompleted = false
	Observer.observe(document, { childList: true, subtree: true })
}

observeDocument()
