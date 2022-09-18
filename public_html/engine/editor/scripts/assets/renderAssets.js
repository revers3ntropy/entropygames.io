import {projectID, state} from '../state';
import {reRender, rightClickOption, setRightClick} from "../renderer";
import {cullString} from 'entropy-engine';

const _asset_ = (fileName: string) => `

	<div id="asset${fileName}" class="asset-container">
		<div style="
			display: flex;
			justify-content: center;
			align-items: center;
			width: 150px; height: 150px;
		">
			<div class="asset-image-container">
				<div style="
					background: url(../projects/${projectID}/assets/${fileName}) no-repeat center center;
					" class="asset-image">
				</div>
			</div>

		</div>
		<p style="font-size: 20px; text-align: center; margin: 5px 0">
			${cullString(fileName, 10)}
		</p>

	</div>

`;

export const renderAssets = async (div: JQuery) => {
	if (!state.selectedEntity) throw 'expected a selected entity';

	const projectAssets = await window.request('get-assets', window.apiToken);
	let assetsHTML = '';

	for (const asset of projectAssets) {
		assetsHTML += _asset_(asset.fileName);
	}

	const projectSize = await window.request('folder-size', {
		path: `../projects/${projectID}/`
	});

	div.html(`
		<div>
			Used ${projectSize.mb.toFixed(1)} / 1000 MB
			<form 
				action="https://entropyengine.dev:50001/upload/${projectID}/assets/"
				method="post"
				enctype="multipart/form-data"
				style="
					border-radius: 10px;
					border: 1px solid var(--text-colour);
					padding: 10px;
					display: flex;
					align-items: center;
					justify-content: center;
				"
			>
				Import Assets: <br>
				<input type="file" name="filetoupload" id="fileToUpload"><br>
				<input 
					type="submit" 
					value="Upload"
					name="submit"
					class="button"  
					id="upload-button" 
					style="width: 30%"
				>
			</form>
		</div>
		<div style="
			overflow-y: scroll;
			display: grid;
			grid-auto-rows: auto;
			grid-gap: 1rem;
			grid-template-columns: repeat(auto-fill, 170px);
			height: 100%;
		">
			${assetsHTML}
		</div>
	`);

	// add right-click options
	for (const asset of projectAssets) {
		const file = asset.fileName;

		setRightClick(`asset${file}`, state.selectedEntity, `
			${rightClickOption(`delete_asset_${file}`, async () => {
				await window.request('delete-asset', {
					fileName: file
				})
				// once it has actually been deleted, then re-render
				reRender();
			}, 'delete')}`
		);
	}
};