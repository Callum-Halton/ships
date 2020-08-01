
import Cell from '../shared/cell.mjs';
import { renderConstants } from './renderConstants.mjs';
import ShipModule from './shipModule.mjs';
import Vector2 from './vector2.mjs';

class Network {
    constructor() {
        this.cellPositions = [];
        // this.resource = null;
        
        // for parent network to know demand
        this.cappedConverterDSRatio = 0;
        
    }
}

export class ShipState {
    constructor(pos, cols, rows) {
        this.pos = pos;
        this.networkIndex = 0;
        this.networks = {
            pipe: {}, // networkId (e.g.'n0'): <network-instance>
            cable: {},
            duct: {}
        };
        this.cells = [];
        for (let row = 0; row < rows; row++) {
            this.cells.push([]);
            for (let col = 0; col < cols; col++) {
                this.cells[row].push(new Cell(null, []));
            }
        }
    }
}

export class Ship {
    constructor(state) {
        this.state = state;
    }

    getCell(cellPos) {
        return this.state.cells[cellPos.y][cellPos.x];
    }
    
    // returns boolean
    hasCellAtPos(cellPos) {
        let shipRow = this.state.cells[cellPos.y];
        if (shipRow) {
            let cell = shipRow[cellPos.x];
            if (cell) {
                return true;
            }
        }
        return false;
    }
    
    getNetwork(networkType, networkId) {
        return this.state.networks[networkType][networkId];
    }

    /* public boolean: valid */ addModule(moduleName, cellPos) {
        let cell =  this.getCell(cellPos);
        if (cell.module) {
            return false;
        }
        
        let newModule = new ShipModule(moduleName);
        cell.module = newModule;
        
        let cellsNetworks = cell.networks;
        let modulesOutputs = newModule.outputs;
        for (let networkType in modulesOutputs) {
            let networkId = cellsNetworks[networkType].id;
            if (networkId) {
                this.refreshNetworkIO(networkType, networkId);
            }
        }
        return true;
    }
    
    // returns boolean: valid
    deleteModule(cellPos) {
        let cell = this.getCell(cellPos);
        if (cell.module) {
            let moduleOutputs = cell.module.outputs;
            cell.module = null;
            let cellsNetworks = cell.networks;
            for (let networkType in moduleOutputs) {
                let networkId = cellsNetworks[networkType].id;
                if (networkId) {
                    this.refreshNetworkIO(networkType, networkId);
                }
            }
            return true;
        } else {
            return false;
        }
    }
    
    // returns boolean: valid
    // cellPositions is the two positions to connect
    addConnection(networkType, cellPositions) {
        let connectionDir0To1 = null; // direction from first cell to second cell
        for (let unitVector of [Vector2.up, Vector2.right, Vector2.down, Vector2.left]) {
            if (Vector2.areEqual( Vector2.add(cellPositions[0], unitVector), cellPositions[1] )) {
                connectionDir0To1 = unitVector;
                break;
            }
        }
        if (connectionDir0To1) { // if not null then the cells are adjacent
            let addConnectionDir = true;
            let cellsNetworks = []; // IdsOfnetworksInCells
            let networkIds = [];
            for (let cellPos of cellPositions) {
                let cellsNetwork = this.getCell(cellPos).networks[networkType];
                cellsNetworks.push(cellsNetwork);
                networkIds.push(cellsNetwork.id);
            }
            if (networkIds[0] && networkIds[1]) { // if there are networks in both cells
                if (networkIds[0] !== networkIds[1]) { // if they're not the same network
                    // Then combine the networks ...
                    let conquerorsCellPositions; let conqueredCellPositions;
                    let conquerorId; let conqueredId;
                    let { cellPositions: network_0_cellPositions } = this.getNetwork(networkType, networkIds[0]);
                    let { cellPositions: network_1_cellPositions } = this.getNetwork(networkType, networkIds[1]);
                    
                    // The larger network conquers the smaller network
                    if (network_0_cellPositions.length > network_1_cellPositions.length) {
                        conquerorId = networkIds[0]; conqueredId = networkIds[1];
                        conquerorsCellPositions = network_0_cellPositions; conqueredCellPositions = network_1_cellPositions; 
                    } else {
                        conquerorId = networkIds[1]; conqueredId = networkIds[0];
                        conquerorsCellPositions = network_1_cellPositions; conqueredCellPositions = network_0_cellPositions; 
                    }
                    
                    // Conqueror grabs all the conquered cells
                    for (let cellPos of conqueredCellPositions) {
                        let cell = this.getCell(cellPos);
                        cell.networks[networkType].id = conquerorId;
                        conquerorsCellPositions.push(cellPos);
                    }
                    
                    // Get rid of the conquered network
                    delete this.getNetwork(networkType, conqueredId);
                    
                    // Refesh the conqueror
                    this.refreshNetworkIO(networkType, conquerorId);
                } else {
                    // Else if they both have networks and they're the same then
                    // there is nothing that needs to be done regarding networks
                    // and if they already have a connection then skip adding a
                    // connection.
                    for (let existingDir of cellsNetworks[0].dirs) {
                        // Only need to check on one side because there should
                        // always be a corresponding other half of the
                        // connection in the other cell.
                        if (Vector2.areEqual(existingDir, connectionDir0To1)) {
                            addConnectionDir = false;
                        }
                    }
                }
            } else if (networkIds[0]) { // there is a network in only the first cell
                this.addCellsToNetwork([cellPositions[1]], networkType, networkIds[0]);
            } else if (networkIds[1]) { // there is a network in only the second cell
                this.addCellsToNetwork([cellPositions[0]], networkType, networkIds[1]);
            } else { // Neither cell has a network, so create a new network
                this.createNetworkWithCells(networkType, cellPositions);
            }
            
            if (addConnectionDir) {
                cellsNetworks[0].dirs.push(connectionDir0To1);
                cellsNetworks[1].dirs.push(Vector2.scale(connectionDir0To1, -1));
                return true;
            }
        }
        return false;
    }
    
    // returns boolean: valid
    addCellsToNetwork(cellPositions, networkType, networkId) {
        let network = this.getNetwork(networkType, networkId);
        let shouldRefreshIO = false;
        for (let i = 0; i < cellPositions.length; i++) {
            network.cellPositions.push(cellPositions[i]);
            let cell = this.getCell(cellPositions[i]);
            cell.networks[networkType].id = networkId;
            if (cell.module) {
                shouldRefreshIO = true;
            }
        }
        if (shouldRefreshIO) {
            this.refreshNetworkIO(networkType, networkId);
        }
    }
    
    // returns boolean: valid
    createNetworkWithCells(networkType, cellPositions) {
        let { state } = this;
        let newNetwork = new Network();
        let newNetworkId = `n${state.networkIndex}`;
        state.networkIndex += 1;
        state.networks[networkType][newNetworkId] = newNetwork;
        this.addCellsToNetwork(cellPositions, networkType, newNetworkId);
    }

    // returns boolean: valid
    deleteConnection(networkType, cellPositions) {
        let cells = [];
        let cellsNetworks = [];
        let cellHasSingleConnection = [];
        for (let cellPos of cellPositions) {
            let cell = this.getCell(cellPos);
            let cellsNetwork = cell.networks[networkType];
            cells.push(cell);
            cellsNetworks.push(cellsNetwork);
            cellHasSingleConnection.push(cellsNetwork.dirs.length === 1);
        }

        let connectionDir0To1 = Vector2.sub(cellPositions[1], cellPositions[0]);
        let validConnectionDir0To1 = false;
        for ( let dir of cellsNetworks[0].dirs ) {
            if (Vector2.areEqual(dir, connectionDir0To1)) {
                validConnectionDir0To1 = true;
                break;
            }
        }
        if (validConnectionDir0To1) {
            for (let i = 0; i < cellsNetworks.length; i++) {
                let scale = i === 0 ? 1 : -1;
                cellsNetworks[i].dirs = cellsNetworks[i].dirs.filter( dir => {
                    return !Vector2.areEqual( 
                        dir, Vector2.scale(connectionDir0To1, scale)
                    );
                });
            }
            
            if (cellHasSingleConnection[0] && cellHasSingleConnection[1]) {
                let IdOfNetworkForDeletion = cellsNetworks[0].id;
                this.deleteCellsFromNetwork(cellPositions, networkType, IdOfNetworkForDeletion);
                delete this.getNetwork(networkType, IdOfNetworkForDeletion);
            } else if (cellHasSingleConnection[0]) {
                this.deleteCellsFromNetwork([cellPositions[0]], networkType, cellsNetworks[0].id);
            } else if (cellHasSingleConnection[1]) {
                this.deleteCellsFromNetwork([cellPositions[1]], networkType, cellsNetworks[1].id);
            } else {
                let floodedCellPositions = [];
                let floodIterator = this.floodGenerator(networkType, cellPositions[0]);
                let splitNeeded = true;
                for (let cellPos of floodIterator) {
                    if (Vector2.areEqual(cellPos, cellPositions[1])) {
                        splitNeeded = false;
                        break;
                    }
                    floodedCellPositions.push(cellPos);
                }
                
                floodedCellPositions.forEach( cellPos => this.getCell(cellPos).searched = false );
                
                if (splitNeeded) {
                    this.deleteCellsFromNetwork(floodedCellPositions, networkType, cellsNetworks[0].id);
                    this.createNetworkWithCells(networkType, floodedCellPositions);
                }
            }
            return true;
        }
        return false;
    }

    deleteCellsFromNetwork(cellPositionsForDeletion, networkType, networkId) {
        let cells = [];
        for (let cellPosForDeletion of cellPositionsForDeletion) {
            cells.push(this.getCell(cellPosForDeletion));
        }
        
        let networkTypesOfNetworksToRefreshById = this.eraseNetworkIdAndIOFromCells(networkType, cells);
        
        let network = this.getNetwork(networkType, networkId);
        network.cellPositions =
            network.cellPositions.filter( networkCellPos => {
                for (let cellPosForDeletion of cellPositionsForDeletion) {
                    if (Vector2.areEqual(networkCellPos, cellPosForDeletion)) {
                        return false;
                    }
                }
                return true;
            });
        
        for (let refreshNetworkId in networkTypesOfNetworksToRefreshById) {
            this.refreshNetworkIO(
                networkTypesOfNetworksToRefreshById[refreshNetworkId],
                refreshNetworkId
            );
        }
    }
    
    eraseNetworkIdAndIOFromCells(networkType, cells) {
        let networkTypesOfNetworksToRefreshById = {};
        networkTypesOfNetworksToRefreshById[cells[0].networks[networkType].id] = networkType;
        
         for (let cell of cells) {
            cell.networks[networkType].id = null;
            
            let { module } = cell;
            if (module) {
                
                let { outputs } = module;
                if (outputs[networkType]) {
                    
                    for (let modulesNetworkType in outputs) {
                        outputs[modulesNetworkType].output = 0;
                        
                        if (modulesNetworkType !== networkType) {
                            let IdOfotherNetworkTypeInCell = cell.networks[modulesNetworkType].id;
                            if (IdOfotherNetworkTypeInCell) {
                                if (!networkTypesOfNetworksToRefreshById[IdOfotherNetworkTypeInCell]) {
                                    networkTypesOfNetworksToRefreshById[IdOfotherNetworkTypeInCell] = modulesNetworkType;
                                }
                            }
                        }
                        
                    }
                }
            }
        }
        
        return networkTypesOfNetworksToRefreshById;
    }
    
    refreshNetworkIO(networkType, networkId, sourceNetworkId=null, confirmedConverterSupply=null) {
        console.log(networkType, networkId, sourceNetworkId);
        let network = this.getNetwork(networkType, networkId);
        
        let potentialConverterDemandByOtherNetworkId = {};
     
        let producers = [];
        let producerSupply = 0;
        let consumers = [];
        let demand = 0;
        let demandLeft = 0;
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
        let potentialConverterSupply = 0;
        
        // sort and tally
        for (let cellPos of network.cellPositions) {
            let { module, networks } = this.getCell(cellPos);
            
            if (module) {
                let { outputs } = module;
                if (networkType in outputs) {
                    
                    let { maxOutput } = outputs[networkType];
                    
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
                                if (otherNetworkId) {
                                    let converterTypeBucket = convertersByOtherNetworkId[converterTypeInContext];
                                    if (!converterTypeBucket[otherNetworkId]) { // Have we not already encountered this other network?
                                        converterTypeBucket[otherNetworkId] = {
                                            otherNetworkType: modulesNetworkType, converters: []
                                        };
                                    }
                                    converterTypeBucket[otherNetworkId].converters.push(module);
                                } 
                                
                                if (converterTypeInContext === "producer") {
                                    potentialConverterSupply += maxOutput;
                                } else {
                                    if (potentialConverterDemandByOtherNetworkId[otherNetworkId]) {
                                        potentialConverterDemandByOtherNetworkId[otherNetworkId] -= maxOutput;
                                    } else {
                                        potentialConverterDemandByOtherNetworkId[otherNetworkId] = -maxOutput;
                                    }
                                }
                                
                                notConverter = false;
                                break;
                            }
                        }
                    }
                    
                    if (notConverter) {
                        if (maxOutput < 0) { // this means that it's a consumer
                            demand -= maxOutput;
                            consumers.push(module);
                        } else { // else it's a producer
                            producerSupply += maxOutput;
                            producers.push(module);
                        }
                    }
                    
                }
            }
        }
        
        // add demand from downstream networks
        let consumerConverters = convertersByOtherNetworkId.consumer;
        for (let otherNetworkId in consumerConverters) {
           let consumingNetworksCappedConverterDSRatio = this.getNetwork(
                consumerConverters[otherNetworkId].otherNetworkType, otherNetworkId
            ).cappedConverterDSRatio;
            
            demand += 
                potentialConverterDemandByOtherNetworkId[otherNetworkId] 
                * consumingNetworksCappedConverterDSRatio;
        }
        
        // subtract demand satisfied by producers
        demandLeft = demand;
        if (producerSupply) {
            let cappedProducerDSRatio = Math.min(demand / producerSupply, 1); // DS = DemandSupply
            
            // relevant to network being refreshed
            for (let producer of producers) {
                let relevantOutput = producer.outputs[networkType];
                relevantOutput.output = relevantOutput.maxOutput * cappedProducerDSRatio;
            }
            demandLeft -= (producerSupply * cappedProducerDSRatio);
        }
        
        // provide this ratio in network for upstream use
        network.cappedConverterDSRatio = 
            Math.min(demandLeft / potentialConverterSupply, 1);
            
        
            
        // If upstream is not the sourceNetwork, update upstream
        // Also get confirmed converter supply
        let producerConverters = convertersByOtherNetworkId.producer;
        for (let otherNetworkId in producerConverters) {
            if (otherNetworkId === sourceNetworkId) {
                demandLeft -= confirmedConverterSupply;
            } else {
                demandLeft -= this.refreshNetworkIO(
                    producerConverters[otherNetworkId].otherNetworkType,
                    otherNetworkId,
                    networkId
                );
            }
        }

        // Now distribute confirmed supply
        let confirmedSupply = demand - demandLeft;
        let cappedSDRatio;
        if (demand === 0) {
            cappedSDRatio = 0;
        } else {
            cappedSDRatio = Math.min(confirmedSupply / demand, 1);
        }
        
        // To consumers
        for (let consumer of consumers) {
            let relevantOutput = consumer.outputs[networkType];
            relevantOutput.output = relevantOutput.maxOutput * cappedSDRatio;
        }
        
        // Used immediately below
        function calculateAndSetSupplyToConsumingNetwork(ship, otherNetworkId) {
            let { otherNetworkType, converters } = convertersByOtherNetworkId.consumer[otherNetworkId];
            let SupplyToConsumingNetwork = 0;
            
            let consumingNetworksCappedConverterDSRatio = ship.getNetwork(
                consumerConverters[otherNetworkId].otherNetworkType, otherNetworkId
            ).cappedConverterDSRatio;
            let scale = consumingNetworksCappedConverterDSRatio * cappedSDRatio;
            
            //console.log('b');
            //console.log(consumingNetworksCappedConverterDSRatio, cappedSDRatio, scale);
            
            for (let converter of converters) {
                let relevantOutput = converter.outputs[networkType];
                let otherOutput = converter.outputs[otherNetworkType];
                relevantOutput.output = relevantOutput.maxOutput * scale;
                otherOutput.output = otherOutput.maxOutput * scale;
                SupplyToConsumingNetwork += otherOutput.output;
            }
            
            return SupplyToConsumingNetwork;
        }
        
        // To downstream
        let sourceNetworkIsConsumer = false;
        for (let otherNetworkId in consumerConverters) {
            if (otherNetworkId === sourceNetworkId) {
                sourceNetworkIsConsumer = true;
            } else {
                this.refreshNetworkIO(
                    consumerConverters[otherNetworkId].otherNetworkType,
                    otherNetworkId,
                    networkId,
                    calculateAndSetSupplyToConsumingNetwork(this, otherNetworkId)
                );
            }
        }
        if (sourceNetworkIsConsumer) {
            return calculateAndSetSupplyToConsumingNetwork(this, sourceNetworkId);
        }
        
    }

    * floodGenerator(networkType, cellPos) {
        let cellPositionsToSearchNow = [cellPos];
        while (cellPositionsToSearchNow.length > 0) {
            
            let cellPositionsToSearchNext = [];
            for (let cellPos of cellPositionsToSearchNow) {
                
                let cell = this.getCell(cellPos);
                if (!cell.searched) {
                    yield cellPos;
                    for (let dir of cell.networks[networkType].dirs) {
                        cellPositionsToSearchNext.push(
                            Vector2.add(cellPos, dir)
                        );
                    }
                    cell.searched = true;
                }
            }
            cellPositionsToSearchNow = cellPositionsToSearchNext;
        }
    }
    

    
    draw(ctx) {
        let { x: shipX, y: shipY } = this.state.pos;
        let y = shipY;
        let { cellSize } = renderConstants;
        let { cells } = this.state;

        for (let rowInd = 0; rowInd < cells.length; rowInd++) {
            let row = cells[rowInd];
            let x = shipX;
            for (let cell of row) {
                Cell.draw(ctx, cell, x, y);
                x += cellSize;
            }
            y += cellSize; 
        }
    }
}