function initialize(video, menu) {
	let timeout = 100
	let firstLoadTimeout = 1000
	let highestRate = 3.5
	let increment = 0.25

	function getPlaybackRate(timeout, event = { type: 'no event' }) {
		// 13 is enter 32 is space
		if (event.type === 'keyup' && [13, 32].includes(event.keyCode) === false) return

		if (event.type === 'click') {
			let classList = ['fx', 'lecture__item__link__name', 'mr5', 'lecture__item__link', 'udi-play']
			let videoChanged = classList.some((string, index) => {
				if (event.target.classList.contains(string)) return true
			})
			if (videoChanged) Observer.observe(document, { childList: true, subtree: true })
		}

		chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
			// setTimeout needed to override Udemy's events
			setTimeout(() => {
				if (timeout === firstLoadTimeout) {
					// gotta love algebra
					let itemIndexPosition = (obj.udemy_playback_rate - highestRate) / increment / -1
					setMenuItemsHTML(menu.children[itemIndexPosition])
				}
				video.playbackRate = obj.udemy_playback_rate
			}, timeout)
		})
	}

	function setPlaybackRate(rate, timeout, event) {
		chrome.storage.sync.set({ udemy_playback_rate: rate }, () => {
			video.playbackRate = rate
		})
	}

	// Following the format on Udemy. May remove child span in future.
	function populateItems() {
		menu.innerHTML = `
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
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">.75x<span class="vjs-control-text"> </span></li>
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">.5x<span class="vjs-control-text"> </span></li>
	`
		Object.keys(menu.children).forEach((val, index) => {
			let element = menu.children[val]

			element.addEventListener('click', function() {
				setPlaybackRate(highestRate - index * increment, timeout)
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
		element.style.background = 'red'
	}

	getPlaybackRate(firstLoadTimeout)
	document.addEventListener('keyup', getPlaybackRate.bind(null, timeout), true)
	document.addEventListener('click', getPlaybackRate.bind(null, timeout))
	populateItems()
}

let Observer = new MutationObserver((mutations, observer) => {
	let hasRun = false
	mutations.forEach((mutation, index) => {
		let videoElement = document.getElementsByClassName('vjs-tech')[0]
		let menuElement = document.querySelector(
			'div.vjs-control-bar.hide-when-user-inactive.player-controls > div.playback-controls > div > div.vjs-menu > ul',
		)
		if (videoElement && menuElement && !hasRun) {
			observer.disconnect()
			hasRun = true
			initialize(videoElement, menuElement)
		}
	})
})

Observer.observe(document, { childList: true, subtree: true })
