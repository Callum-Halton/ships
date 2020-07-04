
import Cell from '../shared/cell.mjs';
import { renderConstants } from './renderConstants.mjs';
import ShipModule from './shipModule.mjs';
import Vector2 from './vector2.mjs';

class Network {
    constructor() {
        this.cellPositions = [];
        //this.resource = null;
    }
}

export class ShipState {
    constructor(pos, cols, rows) {
        this.pos = pos;
        this.networkIndex = 0;
        this.networks = {
            pipe: {}, // networkId (e.g.'n0'): <network-instance>
            cable: {}
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
        
        // TODO Next: Remember to change the name of the token after "in" below
        // consistenly elsewhere.
        for (let refreshNetworkId in networkTypesOfNetworksToRefreshById) {
            // Question for Callum: why does refreshNetworkIO need to be given
            // both the network type and the network ID? Is the network type
            // not bound into the network object? In other words, given the
            // network ID should you not be able to get the network type from
            // network object itself?
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
                    
                    outputs[networkType].output = 0;
                    
                    for (let modulesNetworkType in outputs) {
                        
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

    //let dontCheckResource = true;
    //if (moduleSpecs.maxOutputs[networkType].resource === network.resource || dontCheckResource) {

    refreshNetworkIO(networkType, networkId, sourceNetworkId=null) { 
        console.log(networkType);
        let network = this.getNetwork(networkType, networkId);
        
        // these are in the context of the current network
        let convertersByOtherNetworkId = {
            producer: {},
            consumer: {}
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
                                if (otherNetworkId) {
                                    let converterTypeBucket = convertersByOtherNetworkId[converterTypeInContext];
                                    if (!converterTypeBucket[otherNetworkId]) {
                                        converterTypeBucket[otherNetworkId] = {
                                            otherNetworkType: modulesNetworkType, converters: []
                                        };
                                    }
                                    converterTypeBucket[otherNetworkId].converters.push(module);
                                    if (converterTypeInContext === "producer") {
                                        converterSupply += maxOutput;
                                    } else {
                                        demand -= idealOutput;
                                    }
                                    
                                }
                                
                                notConverter = false;
                                break;
                            }
                        }
                    }
                    
                    if (notConverter) {
                        if (idealOutput < 0) {
                            demand -= idealOutput;
                            consumers.push(module);
                        } else {
                            producerSupply += idealOutput;
                            producers.push(module);
                        }
                    }
                    
                }
            }
        }
        
        let demandleft = demand;
        if (producerSupply) {
            let cappedProducerDSRatio = Math.min(demand / producerSupply, 1);
            // relevant to network being refreshed
            for (let producer of producers) {
                let relevantOutput = producer.outputs[networkType];
                relevantOutput.output = relevantOutput.idealOutput * cappedProducerDSRatio;
            }
            demandleft -= (producerSupply * cappedProducerDSRatio);
        }
        
        let producerConverters = convertersByOtherNetworkId.producer;
        for (let otherNetworkId in producerConverters) {
            
            let cappedConverterDSRatio = Math.min(demandleft / converterSupply, 1);
            let { otherNetworkType, converters} = producerConverters[otherNetworkId];
            // setting ideal inputs
            for (let producerConverter of converters) {
                let otherOutput = producerConverter.outputs[otherNetworkType];
                otherOutput.idealOutput = otherOutput.maxOutput * cappedConverterDSRatio;
            }
            
            this.refreshNetworkIO(otherNetworkType, otherNetworkId, networkId);
            
            // setting outputs to actual inputs
            for (let converter of converters) {
                let relevantOutput = converter.outputs[networkType];
                let otherOutput = converter.outputs[otherNetworkType];
                relevantOutput.output = -otherOutput.output;
                demandleft -= relevantOutput.output;
                converterSupply -= relevantOutput.maxOutput;
            }

        }
        
        let confirmedSupply = demand - demandleft;
        
        let cappedSDRatio = Math.min(confirmedSupply / demand, 1);
        if (!cappedSDRatio) {
            cappedSDRatio = 0;
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
                this.refreshNetworkIO(otherNetworkType, otherNetworkId);
            }
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