var book_keeping = require('book_keeping');

var MEDIUM_MINER = 'MEDIUM_MINER';
var MEDIUM_TRANSPORT = 'MEDIUM_TRANSPORT';
var MEDIUM_WORKER = 'MEDIUM_WORKER';

var HEAVY_WORKER = 'HEAVY_WORKER';
var HEAVY_MINER = 'HEAVY_MINER';

var CLAIMER = 'CLAIMER';
var SCOUT = 'SCOUT';

module.exports = {
    proto: function () {
        StructureSpawn.prototype.createCustomCreep =
            function (type, max_energy = Infinity, memory = {}) {
                if (this.spawning) return ERR_BUSY;
                var body = mTypes[type](Math.min(max_energy, this.room.energyAvailable));
                if (body.length > 0) {
                    var err = this.createCreep(body, undefined, memory);
                    if (!(err < 0)) {
                        var cost = workerCost(body);
                        console.log("Now spawning a " + type + " at " + this.name + " [" + this.room.name + "] for " + cost + " energy.");
                        book_keeping.expense(book_keeping.CREATE_CREEP, cost);
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
    HEAVY_MINER: HEAVY_MINER,

    CLAIMER: CLAIMER,
    SCOUT: SCOUT
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
    },

    CLAIMER: function (energy) {
        if (energy >= 2100) {
            var body = [CLAIM, CLAIM, CLAIM];
            while (energy >= 50) {
                body.push(MOVE);
                energy -= 50;
            }
            return body;
        } else {
            return [];
        }
    },

    SCOUT: function (energy) {
        if (energy >= 50) {
            return [MOVE];
        } else {
            return [];
        }
    }
};