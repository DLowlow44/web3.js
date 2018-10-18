/*
 This file is part of web3.js.

 web3.js is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 web3.js is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @file SendMethodCommand.js
 * @author Samuel Furter <samuel@ethereum.org>
 * @date 2018
 */

import _ from 'underscore';
import AbstractSendMethodCommand from '../../lib/commands/AbstractSendMethodCommand';

export default class SendMethodCommand extends AbstractSendMethodCommand {

    /**
     * @param {TransactionConfirmationWorkflow} transactionConfirmationWorkflow
     *
     * @constructor
     */
    constructor(transactionConfirmationWorkflow) {
        super(transactionConfirmationWorkflow);
    }

    /**
     * Checks if gasPrice is set, sends the request and returns a PromiEvent Object
     *
     * @method execute
     *
     * @param {AbstractWeb3Module} moduleInstance
     * @param {AbstractMethodModel} methodModel
     * @param {PromiEvent} promiEvent
     *
     * @callback callback callback(error, result)
     * @returns {PromiEvent}
     */
    execute(moduleInstance, methodModel, promiEvent) {
        methodModel.beforeExecution(moduleInstance);

        if (this.isGasPriceDefined(methodModel.parameters)) {
            this.send(methodModel, promiEvent, moduleInstance);

            return promiEvent;
        }

        this.getGasPrice(moduleInstance.currentProvider).then(gasPrice => {
            if (_.isObject(methodModel.parameters[0])) {
                methodModel.parameters[0].gasPrice = gasPrice;
            }

            this.send(methodModel, promiEvent, moduleInstance);
        });

        return promiEvent;
    }

    send(methodModel, promiEvent, moduleInstance) {
        moduleInstance.currentProvider.send(
            methodModel.rpcMethod,
            methodModel.parameters
        ).then(response => {
            this.transactionConfirmationWorkflow.execute(
                methodModel,
                moduleInstance,
                response,
                promiEvent
            );

            promiEvent.emit('transactionHash', response);

            if (methodModel.callback) {
                methodModel.callback(false, response);
            }
        }).catch(error => {
            promiEvent.reject(error);
            promiEvent.emit('error', error);
            promiEvent.removeAllListeners();

            if (methodModel.callback) {
                methodModel.callback(error, null);
            }
        });

        return promiEvent;
    }

    /**
     * Checks if gasPrice is defined in the method options
     *
     * @method isGasPriceDefined
     *
     * @param {Array} parameters
     *
     * @returns {Boolean}
     */
    isGasPriceDefined(parameters) {
        return _.isObject(parameters[0]) && typeof parameters[0].gasPrice !== 'undefined';
    }

    /**
     * Returns the current gasPrice of the connected node
     *
     * @param {AbstractProviderAdapter | EthereumProvider} provider
     *
     * @returns {Promise<String>}
     */
    getGasPrice(provider) {
        return provider.send('eth_gasPrice', []);
    }
}