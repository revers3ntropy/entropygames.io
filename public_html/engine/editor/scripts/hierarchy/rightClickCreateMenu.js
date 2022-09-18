import {reRender, rightClickOption, setRightClick} from "../renderer";
import {setSelected, state} from "../state";
import { Camera, Entity, v3, Transform, CircleCollider, CircleRenderer, RectCollider, RectRenderer } from "entropy-engine";

export function setRightClickAddEntityMenu(divID: string) {
	if (!state.selectedEntity) throw 'no selected entity';
	setRightClick(divID, state.selectedEntity, `
        <p style="
            background-color: var(--input-bg); 
            margin: 0;
            padding: 2px 5px;
            border-bottom: 1px solid var(--input-opposite-bg)
        ">
            Create
        </p>
        ${rightClickOption('empty', () => {
			setSelected(Entity.newEntity({}));
			reRender();
		})}
        ${rightClickOption('square', () => {
			setSelected(Entity.newEntity({
				name: 'square',
				transform: new Transform({
					scale: new v3(100, 100, 100)
				}),
				components: [
					new RectRenderer({}),
					new RectCollider({})
				]
			}));
			reRender();
		})}
        ${rightClickOption('circle', () => {
			setSelected(Entity.newEntity({
				name: 'circle',
				transform: new Transform({
					scale: new v3(50, 1, 1)
				}),
				components: [
					new CircleRenderer({}),
					new CircleCollider({})
				]
			}));
			reRender();
		})}
        ${rightClickOption('camera', () => {
			setSelected(Entity.newEntity({
				name: 'camera',
				components: [
					new Camera({}),
				]
			}));
			reRender();
		})}
    `);
}