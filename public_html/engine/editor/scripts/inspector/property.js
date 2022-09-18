import {reRender} from "../renderer";
import {state} from '../state';

import {Scene, v2, v3, colour} from "entropy-engine";

function _colour_ (id: string, value: colour, componentName: string) {
	return `
		<input 
			type="color" 
			id="${id}" 
			value="${value.hex}" 
			onchange="window.onPropertyChange('${id}', '${componentName}', ['colour'])"
		>
	`
}

function _transform_ (id: string, value: string, componentName: string, argumentChain: string, key: string, canBeSelf=false) {
	let showValue = `
		<select
			id="${id}"
			onchange="
			${argumentChain.includes('parent')? `
				window.onPropertyChange(
					'${id}',
					'${componentName}',
					[${argumentChain} '${key}'],
					window.findNodeWithName
				)` : `
					window.setParent('${id}')
				`
			}
			"
		>
		
		<option value="">
			None
		</option>
	`;

	let found = false;

	for (let sprite of Scene.activeScene.entities) {
		if (!canBeSelf && Object.is(sprite, state.selectedEntity))
			continue;

		const isSelected = Object.is(value, sprite.transform);

		found ||= isSelected;

		showValue += `
			<option value="${sprite.name}" ${isSelected ? 'selected' : ''}>${sprite.name}</option>
		`;
	}

	showValue += `
		<selection>
	`;

	return showValue;
}

function _array_ (id: string, value: any[], type=typeof value[0]) {

	window[`addElement${id}`] = () => {
		let defaultValue;
		switch (type) {
			case "number":
				defaultValue = 0;
				break;
			case "boolean":
				defaultValue = false;
				break;
			case "object":
				// deals with v2 and any other objects that it can throw its way
				defaultValue = new (eval(value[0].constructor.name))();
				break;

			default:
				if (Array.isArray(value[0])) {
					defaultValue = [];
				} else {
					// includes strings
					defaultValue = '';
				}

		}
		value.push(defaultValue);
		reRender();
	};

	window[`removeElement${id}`] = () => {
		const index = $(`removeElementIndex${id}`).val();
		if (!index) throw 'no index to splice at';
		value.splice(parseInt(index.toString()), 1);
		reRender();
	};

	let showValue = `<div id="${id}" class="array">(${value.length})`;

	for (let i = 0; i < value.length; i++) {
		showValue = `${showValue} <div>${_componentProperty_(value, i.toString(), i.toString())}</div>`;
	}

	showValue += `
		</div>
		<button onclick="window['addElement${id}']()" class="empty-button" style="width: 20px; height: 20px">+</button>
		<span style="border: 1px solid #b1b1b1; border-radius: 3px; height: 24px">
			<input id="removeElementIndex${id}" type="number">
			<button onclick="window['removeElement${id}']()" class="empty-button" style="width: 20px; height: 20px">-</button>
		</span>
	`;

	return showValue;
}

export const _componentProperty_ = (object: any, key: string, componentName: string, chain: (string|number)[]=[], showName=key, type: string | null = null) => {

	let showValue = '';
	let value = object[key];
	type ||= typeof value;

	const description = object.description || '';

	let defaultVal = object.default || '';
	if (typeof object.default === 'object') {
		defaultVal = JSON.stringify(object.default);
	}

	let showDefault = !!defaultVal && value !== defaultVal;

	if (object.default instanceof v2 || object.default instanceof v3){
		defaultVal = object.default.str;
		showDefault = !object.default.equals(value);
	}

	const id = `input-${key}-${componentName}-${chain.join('-')}`;

	let argumentChain = '';
	for (let prop of chain) {
		argumentChain += `'${prop}', `;
	}

	switch (type) {

		case 'rgb':
			showValue = _colour_(id, value, componentName);
			break;

		case 'number':
		case 'string':
			const isNum = typeof value === 'number';
			showValue = `
                    <input 
                        type="${isNum ? 'number' : 'text'}"
                        id="${id}" value="${value}"
                        onchange="window.onPropertyChange('${id}', '${componentName}', [${argumentChain} '${key}'] ${isNum? ', parseFloat' : ''})"
                    >
                `;

			break;
		case 'boolean':
			showValue = `
                    <input 
                        type="checkbox"
                        id="${id}" ${value ? 'checked' : ''} 
                        onchange="window.onPropertyChange('${id}', '${componentName}', [${argumentChain} '${key}'], window.parseBool)"
                        
                    >
                `;
			break;

		case 'v2':
		case 'v3':

			showValue += `
                    <div style="display: flex; justify-content: space-evenly; transform: scale(0.9)">
                `
			showValue += _componentProperty_(value, 'x', componentName, [...chain, key]);
			showValue += _componentProperty_(value, 'y', componentName, [...chain, key]);
			if (type === 'v3')
				showValue += _componentProperty_(value, 'z', componentName, [...chain, key]);

			showValue += '</div>';
			break;

		case 'Transform':
			showValue = _transform_(id, value, componentName, argumentChain, key);
			break;

		case 'object':
		case 'json':
			if (Array.isArray(value)) {
				showValue = _array_(id, value);
				break;
			} else {
				for (let prop in value) {
					showValue += _componentProperty_(value, prop, componentName, [...chain, key])
				}
			}
			break;

		default:
			showValue = `That type ('${type}') is not supported in the editor`;
	}

	return (`

		<div style="
			margin-left: 2px;
			display: grid;
			padding-bottom: 3px;
		">
			<span style="grid-column: 1/1; font-size: 14px" class="tooltip-container">
				${showName}
				
				${!(description || showDefault)? '' : `
					<span class="tooltip-fleeting">
						${description ? description: ''}
						${showDefault ? `Default: ${defaultVal}`: ''}
					</span>
				`}
			</span> 
			<span style="grid-column: 2/2; text-align: right; padding-right: 2px" >
				${showValue}
			</span>
		</div>

	`);
};