import {state} from './state';
import { Camera, v3 } from "entropy-engine";

const worldSpacePosDiv = $('#world-space-pos');
const screenSpacePosDiv = $('#screen-space-pos');

export function renderSceneMenu (div: JQuery) {
	if (!state.sceneCamera) throw 'no camera';
	const cameraZoom = state.sceneCamera.getComponent<Camera>('Camera').zoom.toFixed(2) ?? 'N/A';
	const cameraPos = state.sceneCamera.transform.position ?? v3.zero;
	const worldSpacePos = worldSpacePosDiv.text() || '0, 0';
	const screenSpacePos = screenSpacePosDiv.text() || '0, 0';

	div.html(`
		<style>
			.scene-toolbar-info {
				background-color: vaR(--input-bg); 
				border-radius: 5px;
				margin: 4px;
				padding: 3px;
			}
		</style>
		<div>
			World Space:
			<span id="world-space-pos" class="scene-toolbar-info">
			 	${worldSpacePos}
			</span>
		</div>
		
		<div>
			Screen Space:
			<span id="screen-space-pos" class="scene-toolbar-info">
			 	${screenSpacePos}
			</span>
		</div>
			
		<div>
			Zoom:
			<span id="scene-camera-zoom" class="scene-toolbar-info">
				${cameraZoom}
			</span>
		</div>
		
		<div>
			Camera Pos:
			<span id="scene-camera-pos" class="scene-toolbar-info">
				${cameraPos.x.toFixed(2)} | ${cameraPos.y.toFixed(2)} | ${cameraPos.z.toFixed(2)}
			</span>
		</div>
	`);
}