module.exports = {
    mine: mine
};

function mine(room, container, callback) {

    var miners = room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role == 'mineral_miner'});
    var carriers = room.find(FIND_MY_CREEPS, {filter: (c) => c.memory.role == 'mineral_carrier'});
    var storage = room.storage;
    var minerals = room.find(FIND_MINERALS);

    if (minerals.length > 0) {
        var mineral = minerals[0];

        if (mineral.mineralAmount > 0) {

            if (miners.length == 0) {
                callback([WORK, WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE], (name) => Game.creeps[name].memory.role = 'mineral_miner');
            } else {
                var miner = miners[0];
                if (miner.pos.inRangeTo(container.pos.x, container.pos.y, 0)) {
                    if (_.sum(container.store) <= container.storeCapacity - 12) {
                        miner.harvest(mineral);
                    }
                } else {
                    miner.myMoveTo(container);
                }
            }

            if (carriers.length == 0) {
                callback([CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE, CARRY, CARRY, MOVE], (name) => Game.creeps[name].memory.role = 'mineral_carrier');
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