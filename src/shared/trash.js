    badRefreshNetworkIO(networkType, networkId, sourceNetworkId=null, indent='') { 
        console.log(`${indent}${networkType} network: ${networkId}`);
        indent += '   ';
        let network = this.getNetwork(networkType, networkId);
        
        // This data structure is tracking the other networks in relationship with
        // the current network
        let convertersByOtherNetworkId = {
            producer: {/*
                othernetworkId: {
                    otherNetworkType: e.g. 'pipe',
                    converters: [modules]
                },
                ...
            */},
            consumer: { /* same as above */ },
        };
        let converterSupply = 0;
        
        let producers = [];
        let producerSupply = 0;
        
        let consumers = [];
        let demand = 0;

        for (let cellPos of network.cellPositions) {
            let { module, networks } = this.getCell(cellPos);
            
            if (module) {
                let { outputs } = module;
                if (networkType in outputs) {
                    
                    let { idealOutput, maxOutput } = outputs[networkType];
                    
                    let notConverter = true;
                    for (let modulesNetworkType in outputs) {
                        if (modulesNetworkType !== networkType) {
                            let converterTypeInContext = null;
                            if (outputs[networkType].maxOutput > 0 && outputs[modulesNetworkType].maxOutput < 0) {
                                converterTypeInContext = 'producer';
                            } else if (outputs[networkType].maxOutput < 0 && outputs[modulesNetworkType].maxOutput > 0) {
                                converterTypeInContext = 'consumer';
                            }
                            
                            if (converterTypeInContext) {
                                let otherNetworkId = networks[modulesNetworkType].id;
                                if (otherNetworkId) { // look at this - shouldn't this always be defined?
                                    let converterTypeBucket = convertersByOtherNetworkId[converterTypeInContext];
                                    if (!converterTypeBucket[otherNetworkId]) { // Have we not already encountered this other network?
                                        converterTypeBucket[otherNetworkId] = {
                                            otherNetworkType: modulesNetworkType, converters: []
                                        };
                                    }
                                    converterTypeBucket[otherNetworkId].converters.push(module);
                                    if (converterTypeInContext === "producer") {
                                        converterSupply += maxOutput;
                                    } else { // it's a consumer
                                        demand -= idealOutput;
                                    }
                                    
                                }
                                
                                notConverter = false;
                                break;
                            }
                        }
                    }
                    
                    if (notConverter) {
                        if (idealOutput < 0) { // this means that it's a consumer
                            demand -= idealOutput;
                            consumers.push(module);
                        } else { // else it's a producer
                            producerSupply += idealOutput;
                            producers.push(module);
                        }
                    }
                    
                }
            }
        }
        
        // At this point, we have a list of all the producers, consumers,
        // producer-converters, and consumer-converters attached to this current
        // network. We also have a record of the total demand and the supply
        // from both the producers (producerSupply) and producer-converters.
        
        // First get as much as possible from the producers (over producer-converters)
        let demandleft = demand;
        if (producerSupply) {
            let cappedProducerDSRatio = Math.min(demand / producerSupply, 1); // DS = DemandSupply
            // relevant to network being refreshed
            for (let producer of producers) {
                let relevantOutput = producer.outputs[networkType];
                relevantOutput.output = relevantOutput.idealOutput * cappedProducerDSRatio;
            }
            demandleft -= (producerSupply * cappedProducerDSRatio);
        }

        // Second, satisfying any remaining demand from the producer-converters
        // We need to iterate over these even if there is no left-over demand because now
        // they might be told to quit supplying.
        let producerConverters = convertersByOtherNetworkId.producer;
        for (let otherNetworkId in producerConverters) {
            
            let cappedConverterDSRatio = Math.min(demandleft / converterSupply, 1);
            let { otherNetworkType, converters} = producerConverters[otherNetworkId];
            // setting ideal inputs
            for (let producerConverter of converters) {
                // Setting the effect on the other network
                let otherOutput = producerConverter.outputs[otherNetworkType];
                otherOutput.idealOutput = otherOutput.maxOutput * cappedConverterDSRatio;
            }
            
            //if (sourceNetworkId !== otherNetworkId) {
                this.refreshNetworkIO(otherNetworkType, otherNetworkId, networkId, indent);
            //}
            
            // setting outputs to actual inputs
            for (let producerConverter of converters) {
                let relevantOutput = producerConverter.outputs[networkType];
                let otherOutput = producerConverter.outputs[otherNetworkType];
                relevantOutput.output = -otherOutput.output;
                demandleft -= relevantOutput.output;
                converterSupply -= relevantOutput.maxOutput;
            }

        }
        
        let confirmedSupply = demand - demandleft;
        
        // Now distribute this confirmed supply
        let cappedSDRatio;
        if (demand === 0) {
            cappedSDRatio = 0;
        } else {
            cappedSDRatio = Math.min(confirmedSupply / demand, 1);
        }
        
        
        for (let consumer of consumers) {
            let relevantOutput = consumer.outputs[networkType];
            relevantOutput.output = relevantOutput.idealOutput * cappedSDRatio;
        }
        
        let consumerConverters = convertersByOtherNetworkId.consumer;
        for (let otherNetworkId in consumerConverters) {
            let { otherNetworkType, converters} = consumerConverters[otherNetworkId];
            
            // setting ideal inputs
            for (let consumerConverter of converters) {
                let relevantOutput = consumerConverter.outputs[networkType];
                relevantOutput.output = relevantOutput.idealOutput * cappedSDRatio;
            }
            
            if (sourceNetworkId !== otherNetworkId) {
                this.refreshNetworkIO(otherNetworkType, otherNetworkId, networkId, indent);
            }
        }
            
    }