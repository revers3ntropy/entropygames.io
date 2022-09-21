const popupStack = [];
const hidePopupFunctions = {};

export function hidePopup(id) {
	hidePopupFunctions[id]?.() || console.error(`hidePopup: none with id ${id}`);
}

export const Popup = reservoir.Component('pop-up', ({
	content,
	id,
	shown = true,
}) => {
	if (!shown) return;

	const $p = document.createElement('div');
	$p.classList.add('popup');
	$p.id = `__Popup${id}`;

	$p.innerHTML = `
		<div class="popup-content" pour.popupId="${id}">
			${content}
		</div>
	`;

	document.body.appendChild($p);

	function hide() {
		$p.remove();
		popupStack.splice(popupStack.indexOf(id), 1);
		removeEventListener('keydown', keyDownListener);
		return 1;
	}

	hidePopupFunctions[id] = hide;

	$p.addEventListener('click', evt => {
		// check that we clicked on the background not the popup content
		if (evt.target.classList.contains('popup')) {
			hide();
		}
	});

	function keyDownListener(evt) {
		if (evt.key === 'Escape') {
			if (popupStack[popupStack.length - 1] === id) {
				hide();
			}
		}
	}

	addEventListener('keydown', keyDownListener);

	popupStack.push(id);
})