const MAX_RATE = 4
const MIN_RATE = 0.5
const INCREMENT = 0.25

const LECTURE_ITEM_LINK_SELECTION_COLOR = 'rgb(0, 94, 114)'
const DETAIL_BUTTON = 'detail__continue-button'
const MENU_ITEM_HIGHLIGHT = 'rgb(236, 82, 82)'

// if the event.target.classList contains one of these classes
// start mutation observer
const CLASS_LIST = [
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

const observeClick = event => {
	const willObserve = () => {
		if (ccBackgroundColor(event.target)(LECTURE_ITEM_LINK_SELECTION_COLOR)) return false
		// used to catch a pesky span on "continue to lecture" button
		if (event.target.tagName === 'SPAN') {
			if (ccClass(event.target)(DETAIL_BUTTON)) return true
		}
		// ensures mutation observer not run (and thus elements not removed) if click
		// on current video list item on the video player page
		// current is determined from background color of the list item (the blue background)
		if (ccBackgroundColor(event.target)(LECTURE_ITEM_LINK_SELECTION_COLOR)) return false

		return CLASS_LIST.some(string => {
			if (isInClassList(string)(event.target)) return true
		})
	}
	if (willObserve()) {
		// if new video selected or some continue button clicked, run setup for next video
		observeDocument()
	}
}
// Udemy uses AJAX for everything which rebuilds HTML necessitating the rerunning of
// mutation observers. As document is not rebuilt use event delegation to caputure clicks
document.addEventListener('click', observeClick)

// check if some computed value from node or its ancestors equals some expected value
const nodeInChainMeetsCondition = node => computeFn => expected => nullNodeReturnVal => {
	if (node == null || node.parentNode == null) return nullNodeReturnVal
	if (computeFn(node) === expected) return true
	if (node.parentNode.isEqualNode(document)) return false
	return nodeInChainMeetsCondition(node.parentNode)(computeFn)(expected)(nullNodeReturnVal)
}

// let's get functional
const applyFn = val => fn => fn(val)
const getStyle = node => applyFn(node)(getComputedStyle)
const getProp = obj => prop => obj[prop]
const getPropOfStyle = node => prop => getProp(getStyle(node))(prop)

const getBackgroundColor = node => getPropOfStyle(node)('backgroundColor')
const isInClassList = className => node => getProp(node)('classList').contains(className)

// cc means check chain (check recursively up the node chain)
const ccBackgroundColor = node => color => nodeInChainMeetsCondition(node)(getBackgroundColor)(color)(false)
const ccClass = node => className => nodeInChainMeetsCondition(node)(isInClassList(className))(className)(true)

function initialize(video, menu, rateBtn) {
	function getPlaybackRate(event) {
		// if video made it to end, run setup for next video
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
		// give us a functor of length iterations to run reduce on
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
				setMenuItemsHTML(element)
			})
		})
	}

	function setMenuItemsHTML(element) {
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

	video.addEventListener('loadeddata', getPlaybackRate)
	video.addEventListener('play', getPlaybackRate)
	video.addEventListener('ended', getPlaybackRate)

	// clicking the playback rate display increments the rate by INCREMENT
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
		// if all desired nodes exist
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
	// if not initial pageload manually remove elements so we can use mutation observer when new video
	// is loaded - without this mutationObserver may complete on current elements instead of new elements
	// filled out by Udemy AJAX request
	nodes.forEach(node => {
		if (node) node.remove()
	})
	Observer.observe(document, { childList: true, subtree: true })
}

observeDocument()
