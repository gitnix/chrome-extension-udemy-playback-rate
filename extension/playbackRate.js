const MAX_RATE = 4
const MIN_RATE = 0.5
const INCREMENT = 0.25

const MENU_ITEM_HIGHLIGHT = 'rgb(236, 82, 82)'

function initialize(video, menu, rateBtn) {
	function getPlaybackRate(event) {
		chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
			// gotta love algebra
			let itemIndexPosition = (obj.udemy_playback_rate - MAX_RATE) / INCREMENT / -1
			setMenuItemsHTML(menu.children[itemIndexPosition], menu)
			video.playbackRate = obj.udemy_playback_rate
		})
	}

	function setPlaybackRate(rate = 0, event) {
		// no rate passed means default value case, which is to increment rate by INCREMENT
		if (rate === 0) {
			chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
				let newRate = obj.udemy_playback_rate + INCREMENT
				if (newRate > MAX_RATE) newRate = MIN_RATE
				let itemIndexPosition = (newRate - MAX_RATE) / INCREMENT / -1
				setMenuItemsHTML(menu.children[itemIndexPosition], menu)
				chrome.storage.sync.set({ udemy_playback_rate: newRate }, () => {
					video.playbackRate = newRate
				})
			})
		} else
			chrome.storage.sync.set({ udemy_playback_rate: rate }, () => {
				video.playbackRate = rate
			})
	}

	function populateItems() {
		let iterations = 1 + (MAX_RATE - MIN_RATE) / INCREMENT
		// give us an array of length iterations to run reduce on
		let menuItems = Array(iterations).fill()
		// construct a chunk of HTML to give to innerHTML of menu
		let menuHtml = menuItems.reduce((acc, curr, index) => (acc += renderListItem(index)), '')

		menu.innerHTML = menuHtml
		Object.keys(menu.children).forEach((val, index) => {
			let element = menu.children[val]
			// menu item will change playback rate to its value when clicked
			element.addEventListener('click', () => {
				setPlaybackRate(MAX_RATE - index * INCREMENT)
				// make item clicked the selected item
				setMenuItemsHTML(element, menu)
			})
		})
	}

	video.addEventListener('loadeddata', getPlaybackRate)
	video.addEventListener('play', getPlaybackRate)
	video.addEventListener('ended', getPlaybackRate)

	// clicking the playback rate display increments the rate by INCREMENT
	rateBtn.addEventListener('click', () => setPlaybackRate())

	populateItems()
}

function renderListItem(index) {
	let playbackNumber = MAX_RATE - INCREMENT * index
	let listItem = `
		<li tabindex="-1" role="menuitem" aria-live="polite" aria-disabled="false" aria-checked="false">
			${playbackNumber}x
			<span class="vjs-control-text"></span>
		</li>`
	return listItem
}

function setMenuItemsHTML(element, menu) {
	// set all menu items to be unselected
	Object.keys(menu.children).forEach(val => {
		let el = menu.children[val]
		el.setAttribute('aria-checked', false)
		el.setAttribute('title', '')
		el.children[0].innerHTML = ''
		el.style.background = ''
	})
	// adjust click event menu item to be selected
	element.setAttribute('aria-checked', true)
	element.setAttribute('title', ', selected')
	element.children[0].innerHTML = ', selected'
	element.style.background = MENU_ITEM_HIGHLIGHT
}

let videoToAdd = false
let menuToAdd = false
let rateBtnToAdd = false

let checkForClass = (node, classCheck, type) => {
	if (type === 'video') {
		if (!node.target.classList) return false
		if (node.target.classList.contains(classCheck)) {
			let firstChild = node.target.children[0]
			if (firstChild) {
				if (firstChild.classList.contains('vjs-tech')) {
					videoToAdd = firstChild
					return
				}
			}
			return
		}
	}

	if (node.children) {
		let children = Array.from(node.children)
		children.forEach(child => {
			if (child.classList.contains(classCheck)) {
				if (type === 'menu') {
					if (!child.firstChild) return
					if (child.firstChild.textContent === 'Speed') {
						menuToAdd = child
						return
					}
					return
				}
				rateBtnToAdd = child
				return
			}
			return checkForClass(child, classCheck, type)
		})
	} else return
}

let Observer = new MutationObserver((mutations, observer) => {
	mutations.forEach(mutation => {
		checkForClass(mutation, 'video-js', 'video')

		if (mutation.addedNodes.length > 0) {
			let addedNodes = Array.from(mutation.addedNodes)
			addedNodes.forEach(node => {
				checkForClass(node, 'vjs-menu-content', 'menu')
				checkForClass(node, 'vjs-playback-rate-value', 'rateBtn')
			})
		}
		if (videoToAdd && menuToAdd && rateBtnToAdd) {
			initialize(videoToAdd, menuToAdd, rateBtnToAdd)
			videoToAdd = menuToAdd = rateBtnToAdd = false
		}
	})
})

Observer.observe(document, { childList: true, subtree: true })
