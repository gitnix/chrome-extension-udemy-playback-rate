const MAX_RATE = 4
const MIN_RATE = 0.5
const INCREMENT = 0.25

const LECTURE_ITEM_LINK_SELECTION_COLOR = 'rgb(0, 94, 114)'

const observeClick = event => {
	const classList = [
		'fx',
		'lecture__item__link__name',
		'lecture__item__link__time',
		'mr5',
		'lecture__item__link',
		'udi-play',
		'udi-next',
		'continue-button--btn__label--3H0BR',
		'continue-button--responsive--3c3TI',
		'play-icon',
		'detail__continue-button',
	]

	const willObserve = () => {
		// used to catch a pesky span on "continue to lecture" button
		if (event.target.tagName === 'SPAN') if (checkForDetailContinueButton(event.target)) return true
		// ensures mutation observer not run (and thus elements not removed) if click on current video list item
		// in which current is determined from background color of selection
		if (checkChainForBackgroundColor(event.target, LECTURE_ITEM_LINK_SELECTION_COLOR)) return false

		return classList.some(string => {
			if (event.target.classList.contains(string)) return true
		})
	}
	if (willObserve()) {
		// if the user selected a new video or clicked continue, run setup for next video
		observeDocument()
	}
}

function nodeInChainMeetsCondition(node, computeFn, expected, nullNodeReturnVal = false) {
	if (node == null || node.parentNode == null) return nullNodeReturnVal
	if (computeFn(node) === expected) return true
	if (node.parentNode.isEqualNode(document)) return false
	return nodeInChainMeetsCondition(node.parentNode, computeFn, expected, nullNodeReturnVal)
}

const getNodeStyle = node => getComputedStyle(node)
const getBackgroundColor = node => getNodeStyle(node).backgroundColor
const isInClassList = className => node => node.classList.contains(className)
const checkChainForBackgroundColor = (node, color) => nodeInChainMeetsCondition(node, getBackgroundColor, color)
// used to catch a pesky span on "continue to lecture" button
const checkForDetailContinueButton = node =>
	nodeInChainMeetsCondition(node, isInClassList('detail__continue-button'), true, true)

// is used to check if new video selected or continue button clicked
document.addEventListener('click', observeClick)

function initialize(video, menu, rateBtn) {
	function getPlaybackRate(event) {
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

	function setPlaybackRate(rate = 0, event) {
		// no rate passed means default value case, which is to increment rate by INCREMENT
		if (rate === 0) {
			chrome.storage.sync.get({ udemy_playback_rate: 1 }, obj => {
				let newRate = obj.udemy_playback_rate + INCREMENT
				if (newRate > MAX_RATE) newRate = MIN_RATE
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

	function populateItems() {
		let iterations = 1 + (MAX_RATE - MIN_RATE) / INCREMENT
		let menuItems = Array(iterations).fill()
		let menuHtml = menuItems.reduce((acc, curr, index) => (acc += renderListItem(index)), '')

		menu.innerHTML = menuHtml
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
		setPlaybackRate()
	})

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

const getVideoElement = () => document.getElementsByTagName('video')[0]

const getMenuElement = () =>
	document.querySelector(
		'div.vjs-playback-rate.vjs-menu-button.vjs-menu-button-popup.vjs-control.vjs-button > div.vjs-menu > ul.vjs-menu-content',
	)

const getRateButton = () => document.getElementsByClassName('vjs-playback-rate-value')[0]

const getRequiredNodes = () => [getVideoElement(), getMenuElement(), getRateButton()]

let Observer = new MutationObserver((mutations, observer) => {
	mutations.forEach(() => {
		let requiredNodes = getRequiredNodes()
		let documentReady = requiredNodes.every(el => !!el == true)
		if (documentReady) {
			observer.disconnect()
			initialize(...requiredNodes)
		}
		return
	})
})

function observeDocument() {
	let nodes = getRequiredNodes()
	// if not initial page load manually remove elements so we can use mutation observer on video change
	nodes.forEach(node => {
		if (node) node.remove()
	})
	Observer.observe(document, { childList: true, subtree: true })
}

observeDocument()
