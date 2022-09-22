export const Dropdown = reservoir.Component('drop-down', ({
	title='',
	icon='',
	content,
}) => {

	setTimeout(() => {
		$('.ui.dropdown').dropdown();
	}, 1000);

	return `
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