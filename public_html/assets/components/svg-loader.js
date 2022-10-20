export const SvgLoader = hydrate.Component('svg-loader', async ({
	id, href, width=50, height=50
}) => hydrate.html`
	<style>
		.svg-loader-svg-${id} svg {
			width: ${width}px;
			height: ${height}px;
		}
	</style>
	<span class="svg-loader-svg-${id}" style="width: ${width}; height: ${height}">
		${hydrate.raw(await fetch(href).then((response) => response.text()))}
	</span>
`);