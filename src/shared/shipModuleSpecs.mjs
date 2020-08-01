
class Spec {
    constructor(color, type, maxOutputs, maxReserve) {
        this.color = color;
        this.type = type;
        this.maxOutputs = maxOutputs;
        this.maxReserve = maxReserve;
    }
}

class RGB {
    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
}

export const shipModuleSpecs = {
    solarPanel: new Spec( new RGB(0, 255, 0), 
        'producer',
        { cable: { amount: 10, resource: 'power'} },
        null
    ),
    
    reactor: new Spec(new RGB(0, 0, 255),
        'converter',
        {
            pipe: { amount: -10, resource: 'fuel'},
            cable: { amount: 10, resource: 'power'}
        },
        null
    ),
    
    engine: new Spec( new RGB(225, 0, 0),
        'consumer',
        { cable: { amount: -10, resource: 'power'} },
        null
    ),
    
    fuelPlant: new Spec( new RGB(0, 225, 225),
        'producer',
        { pipe: { amount: 10, resource: 'fuel'} },
        null
    ),
    /*
    tank: new Spec ( new RGB(0, 255, 0),
        'storage',
        { pipe: { amount: 10, resource: 'fuel'} },
        {amount: 1000, resource: 'fluid'}
    ),
    */
    lifeSupport: new Spec ( new RGB(225, 0, 225),
        'converter',
        {
            cable: { amount: -10, resource: 'power'},
            duct: { amount: 10, resource: 'air'}
        },
        null
    ),
    vent: new Spec ( new RGB(100, 150, 100),
        'consumer',
        { duct: { amount: -10, resource: 'air'} },
        null
    ),
};