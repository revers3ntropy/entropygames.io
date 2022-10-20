export const Dropdown = hydrate.Component('drop-down', ({
	title='',
	icon='',
	content,
}) => {

	Promise.all([
		import('../../assets/lib/semantic/components/dropdown.min.js'),
		import('../../assets/lib/semantic/components/transition.min.js')
	]).then(() => {
		setTimeout(() => {
			$('.ui.dropdown').dropdown();
		}, 10);
	});

	return hydrate.html`
		<div class="ui inline dropdown">
	        <div class="text">
	            <i class='${icon} icon large'></i>
	            ${title}
	        </div>
	        <i class="dropdown icon"></i>
	        <div class="menu">
				${content}
	        </div>
	    </div>
	`;
});