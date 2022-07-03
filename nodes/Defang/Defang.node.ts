import { defang, refang } from 'fanger';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { set } from 'lodash';

export class Defang implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Defang',
		name: 'defang',
		icon: 'file:fang-mouth.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Defang and Refang IoCs',
		defaults: {
			name: 'Defang',
			color: '#f45e43',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Defang',
						value: 'defang',
					},
					{
						name: 'Refang',
						value: 'refang',
					},
				],
				default: 'defang',
				noDataExpression: true,
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description: 'Value that should be defanged',
				displayOptions: {
					show: {
						operation: [
							'defang',
						],
					},
				},
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				description: 'Value that should be refanged',
				displayOptions: {
					show: {
						operation: [
							'refang',
						],
					},
				},
			},
			{
				displayName: 'Property Name',
				name: 'name',
				type: 'string',
				default: 'data',
				description: 'Name of the property to write output to. Supports dot-notation. Example: "data.person[0].name"',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const operation = this.getNodeParameter('operation', itemIndex, '') as string;
			const propertyName = this.getNodeParameter('name', itemIndex, '') as string;
			const value =  this.getNodeParameter('value', itemIndex, '') as string;

			item = items[itemIndex];

			const newItem: INodeExecutionData = {
				json: JSON.parse(JSON.stringify(item.json)),
				pairedItem: item.pairedItem,
			};

			if (item.binary !== undefined) {
				// Create a shallow copy of the binary data so that the old
				// data references which do not get changed still stay behind
				// but the incoming data does not get changed.
				newItem.binary = {};
				Object.assign(newItem.binary, item.binary);
			}
		
			try {
				let output;
				if (operation === 'defang') {
					output = defang(value);
				} else {
					output = refang(value);
				}
				set(newItem.json, propertyName, output);
			} catch (error) {
				// This node should never fail but we want to showcase how
				// to handle errors.
				if (this.continueOnFail()) {
					returnData.push({json: this.getInputData(itemIndex)[0].json, error});
					continue;
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
			returnData.push(newItem);
		}
		return this.prepareOutputData(returnData);
	}
}
