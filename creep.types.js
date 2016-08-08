var MEDIUM_MINER = 'MEDIUM_MINER';
var MEDIUM_TRANSPORT = 'MEDIUM_TRANSPORT';
var MEDIUM_WORKER = 'MEDIUM_WORKER';

var HEAVY_WORKER = 'HEAVY_WORKER';
var HEAVY_MINER = 'HEAVY_MINER';

module.exports = {
    proto: function () {
        StructureSpawn.prototype.createCustomCreep =
            function (type, max_energy = Infinity, memory = {}) {
                var body = mTypes[type](Math.min(max_energy, this.room.energyAvailable));
                if (body.length > 0) {
                    var err = this.createCreep(body, undefined, memory);
                    if (!(err < 0)) {
                        console.log("Now spawning a " + type + " at " + this.name + " [" + this.room.name + "] for " + workerCost(body) + " energy.");
                    }
                    return err;
                } else {
                    return ERR_NOT_ENOUGH_ENERGY;
                }
            };
    },
    MEDIUM_MINER: MEDIUM_MINER,
    MEDIUM_TRANSPORT: MEDIUM_TRANSPORT,
    MEDIUM_WORKER:MEDIUM_WORKER,

    HEAVY_WORKER: HEAVY_WORKER,
    HEAVY_MINER: HEAVY_MINER
};

function workerCost (parts) {
    var cost = 0;
    for (var i = 0; i < parts.length; ++i) {
        var p = parts[i];
        if (p == WORK) {
            cost += 100;
        } else if (p == CARRY) {
            cost += 50;
        } else if (p == MOVE) {
            cost += 50;
        }
    }
    return cost;
}

var mTypes = {
    MEDIUM_MINER: function (energy) {
        var body = [];
        while (energy >= 250) {
            body.push(WORK);
            body.push(WORK);
            body.push(MOVE);
            energy -= 250;
        }
        return body;
    },

    HEAVY_MINER: function (energy) {
        return [WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE];
    },

    MEDIUM_TRANSPORT: function (energy) {
        var body = [];
        while (energy >= 150) {
            body.push(CARRY);
            body.push(CARRY);
            body.push(MOVE);
            energy -= 150;
        }
        return body;
    },

    MEDIUM_WORKER: function (energy) {
        var body = [];
        while (energy >= 200) {
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
            energy -= 200;
        }
        return body;
    },

    HEAVY_WORKER: function (energy) {
        var body = [];
        while (energy >= 450) {
            body.push(WORK);
            body.push(WORK);
            body.push(WORK);
            body.push(CARRY);
            body.push(MOVE);
            body.push(MOVE);
            energy -= 450;
        }
        return body;
    }
};