var tools = require('tools');

var EMGCY_CTRL_DOWNGRADE = 10000;

var WORKER_ROLE = 'worker';
var WORKER_MODE_SUPPLY = 'supply';
var WORKER_MODE_REPAIR_STUFF = 'repair_stuff';
var WORKER_MODE_UPGRADE_CTRL = 'upgrade_ctrl';
var WORKER_MODE_BUILD = 'construct';
var WORKER_MODE_IDLE = 'idle';
var WORKER_MODE_DYING = 'dying';

var CTRL_LEVEL = 8;

var procedures = {
    supply: supply,
    repair_stuff: repair_stuff,
    upgrade_ctrl: upgrade_ctrl,
    idle: idle,
    construct: construct
};

var repair_walls_max = 2e3;
var repair_ramparts_max = 2e3;

var repair_comfort = 1e5;

var repair_walls = 6e5;
var repair_ramparts = 6e5;

function f_needs_repair(structure) {
    var decaying = [STRUCTURE_CONTAINER, STRUCTURE_ROAD];
    if (structure.structureType == STRUCTURE_WALL) {
        return Math.max(0, Math.min(repair_walls, structure.hitsMax) - structure.hits);
    } else if (structure.structureType == STRUCTURE_RAMPART) {
        return Math.max(0, Math.min(repair_ramparts, structure.hitsMax) - structure.hits);
    } else if (decaying.indexOf(structure.structureType) >= 0) {
        return Math.max(0, Math.ceil(structure.hitsMax * 0.75) - structure.hits);
    } else {
        return structure.hitsMax - structure.hits;
    }
}

module.exports = {

    WORKER_ROLE: WORKER_ROLE,

    run: function (room) {
        var unassigned = room.find(FIND_MY_CREEPS, {filter: (c) => !c.memory.role});
        for (var i = 0; i < unassigned; ++i) {
            if (_.filter(unassigned[i].body, (p) => p.type == WORK && p.carryCapacity > 0).length > 0) {
                unassigned[i].memory.role = WORKER_ROLE;
                unassigned.memory.mode = WORKER_MODE_IDLE;
            }
        }

        repair_walls = tools.mvalue(room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_WALL}), {u: (s) => s.hits}) + 500;
        repair_ramparts = tools.mvalue(room.find(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_RAMPART}), {u: (s) => s.hits}) + 500;

        repair_walls = Math.min(repair_ramparts, repair_walls, repair_walls_max);
        repair_ramparts = Math.min(repair_ramparts, repair_walls, repair_ramparts_max);

        var workers = room.find(FIND_MY_CREEPS, {filter: (creep) => creep.memory.role == WORKER_ROLE});

        var dying_soon = _.filter(workers, (w) => w.ticksToLive < 25);
        workers = _.filter(workers, (w) => w.ticksToLive >= 25);

        for (var i in dying_soon) {
            dying_soon[i].memory.mode = WORKER_MODE_DYING;
        }

        var damaged_structs = room.find(FIND_STRUCTURES, {filter: (s) => f_needs_repair(s) >= 100});
        var damaged_below_comfort = _.filter(damaged_structs, (s) => s.hits < repair_comfort);
        var damaged_above_comfort = _.filter(damaged_structs, (s) => s.hits >= repair_comfort);
        var damage_total = tools.cumulate(damaged_below_comfort, {u: f_needs_repair}) / 100 + tools.cumulate(damaged_above_comfort, {u: f_needs_repair}) / 1000;

        var towers_that_need_supply = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_TOWER && s.energy < s.energyCapacity - 100});
        var tower_supply_total = tools.cumulate(towers_that_need_supply, {u: (s) => s.energyCapacity - s.energy}) / 200;

        var sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        var sites_const = tools.cumulate(sites, {u: (s) => s.progressTotal - s.progress}) / 5;
        var sites_total = tools.cumulate(sites, {u: (s) => s.progressTotal == 1 ? 250 : s.progressTotal - s.progress}) / 5;

        var work = damage_total + tower_supply_total + sites_total;

        console.log(room.name, damage_total, tower_supply_total, sites_total);

        var idle_workers = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_IDLE);

        if (idle_workers.length > 0) {

            var priorities = [];

            var supply_workers = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_SUPPLY).length;
            var repair_workers = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_REPAIR_STUFF).length;
            var builders = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_BUILD).length;
            var upgraders = _.filter(workers, (creep) => creep.memory.mode == WORKER_MODE_UPGRADE_CTRL).length;

            if (upgraders.length < 1) priorities.push(WORKER_MODE_UPGRADE_CTRL);

            var spl = tower_supply_total + (room.energyCapacityAvailable - room.energyAvailable) / 200;
            if (spl > 0) {
                if (supply_workers == 0) {
                    priorities.push(WORKER_MODE_SUPPLY);
                } else {
                    if (spl / supply_workers > 100) {
                        priorities.push(WORKER_MODE_SUPPLY);
                    }
                }
            }

            if (damage_total > 0) {
                if (repair_workers == 0) {
                    priorities.push(WORKER_MODE_REPAIR_STUFF);
                } else if (damage_total / repair_workers > 100) {
                    priorities.push(WORKER_MODE_REPAIR_STUFF);
                }
            }

            if (sites_const > 0) {
                if (builders == 0) {
                    priorities.push(WORKER_MODE_BUILD)
                } else if (sites_const / builders > 100) {
                    priorities.push(WORKER_MODE_BUILD)
                }
            }

            if (priorities.length == 0 && spl > 0) priorities.push(WORKER_MODE_SUPPLY);
            if (priorities.length == 0 && damage_total > 0) priorities.push(WORKER_MODE_REPAIR_STUFF);
            if (priorities.length == 0 && sites_const > 0) priorities.push(WORKER_MODE_BUILD);
            if (priorities.length == 0) priorities.push(WORKER_MODE_UPGRADE_CTRL);

            while (idle_workers.length > 0 && priorities.length > 0) {
                let worker = idle_workers.pop();
                delete worker.memory.target;
                var job = priorities.shift();
                console.log('Assigned job: ' + job);
                worker.memory.mode = job;
                worker.say(job.substr(0, 3));
            }
        }

        for (var i in workers) {
            var creep = workers[i];
            if (creep.memory.mode == WORKER_MODE_IDLE) {
                idle(creep);
            } else {
                //creep.say(creep.memory.mode.substr(0, 3));
                if (collect(creep)) {
                    procedures[creep.memory.mode](creep);
                }
            }
        }

        for (var i in dying_soon) {
            var creep = dying_soon[i];
            creep.say("TTL: " + (creep.ticksToLive-1));
            idle(creep);
        }

        return workers.length ? Math.floor(work / workers.length) : Infinity;
    }
};

function canCollectFrom(structure, amount) {
    if (structure.structureType == STRUCTURE_CONTAINER ||
        (structure.structureType == STRUCTURE_STORAGE && structure.my))
    {
        if (structure.store.energy >= amount) {
            return true;
        }
    }
    return false;
}

function collect(creep) {
    if (creep.memory.isCollecting) {
        if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.isCollecting = false;
        }
    } else {
        if (creep.carry.energy == 0) {

            creep.memory.mode = WORKER_MODE_IDLE;
            creep.memory.isCollecting = true;

            var structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => canCollectFrom(s, creep.carryCapacity)});
            if (!structure) {
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => canCollectFrom(s, creep.carryCapacity / 2)});
            }
            if (!structure) {
                structure = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => canCollectFrom(s, 50)});
            }


            if (structure) {
                creep.memory.collectFrom = structure.id;
            } else {
                creep.memory.collectFrom = null;
            }
        }
    }

    if (creep.memory.isCollecting) {
        var structure = Game.getObjectById(creep.memory.collectFrom);
        if (structure) {
            if (creep.withdraw(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(structure);
            } else {
                if (creep.carry.energy == creep.carryCapacity || structure.store.energy == 0) {
                    creep.memory.isCollecting = false;
                }
            }
        } else {
            creep.memory.isCollecting = false;
        }
    }

    return !creep.memory.isCollecting;
}

function selectRandomId(list) {
    if (list.length > 0) {
        return list[Math.floor(Math.random() * list.length)].id;
    } else {
        return null;
    }
}

function supply(creep) {
    var supplyable = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_CONTAINER];

    if (!creep.memory.target) {
        creep.memory.target = creep.pos.findClosestByRange(FIND_MY_STRUCTURES,
            {filter: (s) =>  supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});

        /*
         var targets = creep.room.find(FIND_MY_STRUCTURES,
         {filter: (s) =>  supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});
         creep.memory.target = selectRandomId(targets);
         */
    }

    if (!creep.memory.target) {
        creep.memory.mode = WORKER_MODE_IDLE;
    } else {
        var structure = Game.getObjectById(creep.memory.target);
        if (structure) {
            if (structure.energy == structure.energyCapacity) {
                creep.memory.target = null;
                creep.memory.mode = WORKER_MODE_IDLE;
            } else if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(structure);
            }
        } else {
            var targets = creep.room.find(FIND_MY_STRUCTURES,
                {filter: (s) =>  supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});
            creep.memory.target = selectRandomId(targets);
            if (creep.memory.target) {
                supply(creep)
            }
        }
    }
}

function repair_stuff(creep) {
    if (!creep.memory.target || !(creep.memory.ticks > 0)) {
        var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => f_needs_repair(s) >= 100});
        if (target) {
            creep.memory.target = target.id;
            creep.memory.ticks = 10;
        } else {
            creep.memory.target = null;
            creep.memory.ticks = 0;
        }
    }

    if (creep.memory.target) {
        var target = Game.getObjectById(creep.memory.target);
        if (target) {
            if (target.hits <= target.hitsMax - 100) {
                if(creep.pos.inRangeTo(target, 2)) {
                    creep.repair(target);
                    creep.memory.ticks -= 1;
                } else {
                    creep.moveTo(target);
                }
                return;
            }
        }
    }
    creep.memory.mode = WORKER_MODE_IDLE;
    creep.memory.target = null;
    creep.memory.ticks = 0;
}

function upgrade_ctrl(creep) {
    if (! (creep.memory.ticks > 0)) {
        creep.memory.ticks = 25;
    }

    var ctrl = creep.room.controller;
    if (ctrl) {
        if (ctrl.level < CTRL_LEVEL || ctrl.ticksToDowngrade < EMGCY_CTRL_DOWNGRADE) {
            if (creep.upgradeController(ctrl) == ERR_NOT_IN_RANGE) {
                creep.moveTo(ctrl);
            } else {

                creep.memory.ticks -= 1;
                if (! (creep.memory.ticks > 0)) {
                    creep.memory.mode = WORKER_MODE_IDLE;
                }

            }
        } else {
            if (creep.memory.previous_mode) {
                creep.memory.mode = creep.memory.previous_mode;
                delete creep.memory.previous_mode;
            } else {
                creep.memory.mode = WORKER_MODE_IDLE;
            }
        }
    }
}

function construct(creep) {
    if (!creep.memory.target) {
        var target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        if (target) {
            creep.memory.target = target.id;
        } else {
            creep.memory.target = null;
        }
    }

    if (!creep.memory.target) {
        creep.memory.mode = WORKER_MODE_IDLE;
    } else {
        var site = Game.getObjectById(creep.memory.target);
        if (site) {
            var e = creep.build(site);
            if (e == ERR_NOT_IN_RANGE) {
                creep.moveTo(site);
            } else if (e == ERR_INVALID_TARGET) {
                creep.memory.target = null;
            }
        } else {
            var targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
            creep.memory.target = selectRandomId(targets);
        }
    }
}

function idle(creep) {
    if (creep.carry.energy > 0) {
        var s = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_STORAGE || s.structureType == STRUCTURE_CONTAINER});
        if (s) {
            if (creep.transfer(s, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(s);
            }
        }
    } else {
        creep.moveTo(40, 28);
    }
}