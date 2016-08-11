var MEDIUM_MINER = 'MEDIUM_MINER';
var MEDIUM_TRANSPORT = 'MEDIUM_TRANSPORT';
var MEDIUM_WORKER = 'MEDIUM_WORKER';

var HEAVY_WORKER = 'HEAVY_WORKER';
var HEAVY_MINER = 'HEAVY_MINER';

var FAST_MINER = 'FAST_MINER';
var FAST_TRANSPORTER = 'FAST_TRANSPORTER';

var HEAVY_MINER_C = 'HEAVY_MINER_C';

var RESERVER = 'RESERVER';
var SMALL_RESERVER = 'SMALL_RESERVER';
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

    HEAVY_MINER_C: HEAVY_MINER_C,

    FAST_MINER: FAST_MINER,
    FAST_TRANSPORTER: FAST_TRANSPORTER,

    RESERVER: RESERVER,
    SMALL_RESERVER: SMALL_RESERVER,
    SCOUT: SCOUT
};

function workerCost (body) {
    var cost = 0;
    for (var i = 0; i < body.length; ++i) {
        cost += BODYPART_COST[body[i]].type;
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

    HEAVY_MINER_C: function (energy) {
        return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
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

    FAST_MINER: function (energy) {
        return [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];
    },

    FAST_TRANSPORTER: function (energy) {
        var body = [];
        if (energy < 1000) return body;
        while (energy > 100) {
            body.push(CARRY);
            body.push(MOVE);
            energy -= 100;
        }
        return body;
    },

    RESERVER: function (energy) {
        if (energy < 1950) return [];
        return [CLAIM, CLAIM, CLAIM, MOVE, MOVE, MOVE];
    },

    SMALL_RESERVER: function (energy) {
        if (energy < 1300) return [];
        return [CLAIM, CLAIM, MOVE, MOVE];
    },

    SCOUT: function (energy) {
        if (energy >= 50) {
            return [MOVE];
        } else {
            return [];
        }
    }
};