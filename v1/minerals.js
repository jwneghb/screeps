module.exports = {
    mine: mine
};

function mine(room, container, callback, path) {

    var miner_body = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE, MOVE, MOVE];
    var miner_work = _.filter(miner_body, (p) => p == WORK).length * 2;

    var n = Math.min(10, Math.ceil(path * 2 * miner_work / 100 || 5));
    var carrier_body = [];
    for (var i = 0; i < n; ++i) {
        carrier_body.concat([CARRY, CARRY, MOVE]);
    }

    var miners = room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role == 'mineral_miner'});
    var carriers = room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role == 'mineral_carrier'});
    var storage = room.storage;
    var minerals = room.find(FIND_MINERALS);

    if (minerals.length > 0) {
        var mineral = minerals[0];

        if (mineral.mineralAmount > 0) {

            if (miners.length == 0 || miners[0].ticksToLive < miner_body.length * 3) {
                callback(miner_body, (name) => Game.creeps[name].memory.role = 'mineral_miner');
            } else {
                var miner = miners[0];
                if (miner.pos.inRangeTo(container.pos.x, container.pos.y, 0)) {
                    if (_.sum(container.store) <= container.storeCapacity - miner_work) {
                        miner.harvest(mineral);
                    }
                } else {
                    miner.myMoveTo(container);
                }
            }

            if (carriers.length == 0 || carriers[0].ticksToLive < carrier_body.length * 3) {
                callback(carrier_body, (name) => Game.creeps[name].memory.role = 'mineral_carrier');
            }

        }

        if (carriers.length > 0) {
            var carrier = carriers[0];
            if (_.sum(carrier.carry) < carrier.carryCapacity && carrier.ticksToLive > 50) {
                if (carrier.withdraw(container, mineral.mineralType) == ERR_NOT_IN_RANGE) {
                    carrier.myMoveTo(container);
                }
            } else {
                if (carrier.transfer(storage, mineral.mineralType) == ERR_NOT_IN_RANGE) {
                    carrier.myMoveTo(storage);
                }
            }
        }
    }

}