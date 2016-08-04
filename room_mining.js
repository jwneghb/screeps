var tools = require('tools');

module.exports = {
    init: f_init,
    control: f_control,
    minfill: f_set_min_fill,
    fill: f_get_fill
};

function f_get_fill(room) {
    if (!f_room_initialized(room)) return 0;
    var room_data = Memory.mining[room.name];
    var fill = room_data.storage.fill;
    for (var i in room_data.sources) {
        var source_data = room_data.sources[i];
        fill += source_data.container.fill;
    }
    return fill;
}

function f_set_min_fill(source_id, min_fill) {
    var source = Game.getObjectById(source_id);
    if (!f_source_initialized(source)) return false;
    if (min_fill < 0 || min_fill >= 2000) return false;
    Memory.mining[source.room.name].sources[source_id].container.min_fill = min_fill;
    return true;
}

function f_source_initialized(source) {
    if (!source) return false;
     if (!Memory.mining ||
        !Memory.mining[source.room.name] ||
        !Memory.mining[source.room.name].sources ||
        !Memory.mining[source.room.name].sources[source.id]) {
        return false;
    }
    return true;
}

function f_room_initialized(room) {
    if (!room) return false;
    if (!Memory.mining ||
        !Memory.mining[room.name]) {
        return false;
    }
    return true;
}

function f_init (room) {
    if (!room) return false;
    
    if (!Memory.mining) {
        Memory.mining = {};
    }
    
    let stor = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.my && s.structureType == STRUCTURE_STORAGE});
    let storage = {pos: null, id: null, fill: 0};
    if (stor.length > 0) {
        storage = {pos: stor[0].pos, id: stor[0].id, fill: 0};
    }
    
    Memory.mining[room.name] = {
        sources: {},
        storage: storage,
        carriers: []
    };
                
    var sources = room.find(FIND_SOURCES);
    for (let i = 0; i < sources.length; ++i) {
        let s = sources[i];
        
        var container = null;
        let structs = room.lookForAtArea(LOOK_STRUCTURES, s.pos.y-1, s.pos.x-1, s.pos.y+1, s.pos.x+1);
        for (let y in structs) {
            for (let x in structs[y]) {
                if (!container) {
                    let containers = _.filter(structs[y][x], (s) => s.structureType == STRUCTURE_CONTAINER);
                    if (containers.length > 0) {
                        container = {pos: containers[0].pos, id: containers[0].id, fill: 0, min_fill: 0};
                    }
                }
            }
        }
        
        Memory.mining[room.name].sources[s.id] = {
            container: container,
            miners: [],
            carriers: []
        };
    }
}

function ttl(creep_name) {
    var creep = Game.creeps[creep_name];
    return creep ? creep.ticksToLive : 0;
}

function f_assign_miner(creep) {
    if (!creep) return false;
    if (!f_room_initialized(creep.room)) return false;
    
    var room_data = Memory.mining[creep.room.name];
    
    var sources = Object.keys(room_data.sources);
    
    var idx = tools.mindex(sources, {
        u: (s) => tools.mvalue(room_data.sources[s].miners, {u: ttl, c: tools.cmax, i: 0})
    });
    
    if (idx < 0) return false;
    
    room_data.sources[sources[idx]].miners.push(creep.name);
    creep.memory.mining = {isFirst: false, inPosition: false};
    return true;
}

function f_control_miner(creep, source, pos) {
    if (!creep.spawning) {
        if (creep.memory.mining.isFirst) {
            if (creep.memory.mining.inPosition) {
                if (Memory.mining[creep.room.name].sources[source.id].container.fill <= 1988) {
                    creep.harvest(source);
                }
            } else {
                if (creep.pos.inRangeTo(pos, 0)) {
                    creep.memory.mining.inPosition = true;
                    creep.harvest(source);
                } else {
                    creep.moveTo(pos.x, pos.y);
                }
            }
        } else {
            if (!creep.pos.inRangeTo(pos, 1)) {
                creep.moveTo(pos.x, pos.y);
            }
        }
    }
}

function f_control_miners(source, source_data) {
    var n = source_data.miners.length;
    for (var i = 0; i < n; ++i) {
        var miner = Game.creeps[source_data.miners.shift()];
        if (miner) {
            source_data.miners.push(miner.name);
        }
    }
    
    if (source_data.miners.length > 0) {
        var first_miner = Game.creeps[source_data.miners[0]];
        first_miner.memory.mining.isFirst = true;
        f_control_miner(first_miner, source, source_data.container.pos);
        
        for (var i = 1; i < source_data.miners.length; ++i) {
            var miner = Game.creeps[source_data.miners[i]];
            f_control_miner(miner, source, source_data.container.pos);
        }
    }
    
    return tools.mvalue(source_data.miners, {u: ttl, c: tools.cmax, i: 0});
}

function f_spawn_miner(spawn) {
    var name = spawn.createCustomCreep(HEAVY_MINER);
    if (! (name < 0)) {
        f_assign_miner(Game.creeps[name]);
    }
}

function f_spawn_carrier(spawn, max_energy) {
    var name = spawn.createCustomCreep(MEDIUM_TRANSPORT, max_energy);
    if (! (name < 0)) {
        f_assign_carrier(Game.creeps[name]);
    }
}

function f_assign_carrier(creep) {
    if (!creep) return false;
    if (!f_room_initialized(creep.room)) return false;
    var room_data = Memory.mining[creep.room.name];
    
    room_data.carriers.push(creep.name);
    
    creep.memory.mining = {job: null};
    
    return true;
}

var CARRIER_JOBS = {
    SUPPLY: 'supply',
    COLLECT: 'collect',
    FILL: 'fill',
    PICK_UP: 'pick up'
}

function f_collect_priority(source_data) {
    var priority = source_data.container.fill - source_data.container.min_fill;
    var n = source_data.carriers.length;
    
    var k = 0;
    for (var i = 0; i < n; ++i) {
        var carrier = Game.creeps[source_data.carriers[k]];
        if (carrier && carrier.memory.mining.job &&
            carrier.memory.mining.job.order == CARRIER_JOBS.COLLECT &&
            carrier.memory.mining.job.id == source_data.container.id)
        {
            priority -= carrier.carryCapacity;
            k += 1;
        } else {
            source_data.carriers.splice(k, 1);
        }
    }
    
    return priority;
}

function f_assign_job(creep) {
    if (!creep) return false;
    if (!f_room_initialized(creep.room)) return false;
    
    var supplyable = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER];
    
    var room_data = Memory.mining[creep.room.name];
    
    if (creep.ticksToLive < 20) {
        if (creep.carry.energy > 0) {
            var storage = Game.getObjectById(Memory.mining[creep.room.name].storage.id);
            if (storage && storage.store.energy < storage.storeCapacity) {
                creep.memory.mining.job = {order: CARRIER_JOBS.FILL, id: Memory.mining[creep.room.name].storage.id};
                return true;
            }
        } else {
            creep.memory.mining.job = null;
            return false;
        }
    }
    
    if (creep.carry.energy < 50) {
        // COLLECT
        var sources = Object.keys(room_data.sources);
        
        var idx = tools.mindex(sources, {u: (s) => f_collect_priority(room_data.sources[s]),  c: tools.cmax});
        
        if (idx >= 0) {
            source_data = room_data.sources[sources[idx]];
            
            if (f_collect_priority(source_data) > 0) {
                var container = Game.getObjectById(source_data.container.id);
            
                creep.memory.mining.job = {order: CARRIER_JOBS.COLLECT, id: source_data.container.id, min_fill: source_data.container.min_fill};
                if (source_data.carriers.indexOf(creep.name) < 0) {
                    source_data.carriers.push(creep.name);
                }
                return true;
                
            } else {
                
                var structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});
                if (structure) {
                
                    if (room_data.storage.fill >= 50) {
                        creep.memory.mining.job = {order: CARRIER_JOBS.COLLECT, id: room_data.storage.id, min_fill: 0};
                        return true;
                    }
                    
                }
            }
        }
    } else {
        var structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (s) => supplyable.indexOf(s.structureType) >= 0 && s.energy < s.energyCapacity});
        if (structure) {
            // SUPPLY
            creep.memory.mining.job = {order: CARRIER_JOBS.SUPPLY, id: structure.id};
            return true;
        } else {
            // FILL
            var storage = Game.getObjectById(Memory.mining[creep.room.name].storage.id);
            if (storage && storage.store.energy < storage.storeCapacity) {
                creep.memory.mining.job = {order: CARRIER_JOBS.FILL, id: Memory.mining[creep.room.name].storage.id};
                return true;
            }
        }
    }
    
    var dropped = creep.pos.findClosestByPath(FIND_DROPPED_ENERGY);
    if (dropped && dropped.energy >= 50) {
        creep.memory.mining.job = {order: CARRIER_JOBS.PICK_UP, id: dropped.id};
        return true;
    }
    
    creep.memory.mining.job = null;
    
    return false;
}

function f_control_carrier(creep) {
    
    var job = creep.memory.mining.job;
    
    if (!job) {
        f_assign_job(creep)
    }
    
    job = creep.memory.mining.job;
    
    if (job) {
        
        //creep.say(job.order);
        
        var structure = Game.getObjectById(job.id);
        
        if (structure) {
            
            if (Game.flags[creep.name]) {
                Game.flags[creep.name].setPosition(structure.pos);
            } else {
                creep.room.createFlag(structure.pos, creep.name);
            }
        
            if (job.order == CARRIER_JOBS.SUPPLY) {
            
                if (structure.energy < structure.energyCapacity && creep.carry.energy > 0) {
                    if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(structure);
                        return true;
                    }
                }
                
            } else if (job.order == CARRIER_JOBS.FILL) {
                
                if (structure.store.energy < structure.storeCapacity && creep.carry.energy > 0) {
                    if (creep.transfer(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(structure);
                        return true;
                    }
                }
                
            } else if (job.order == CARRIER_JOBS.COLLECT) {
                
                let min = job.min_fill ? job.min_fill : 0;
                if (structure.store.energy > min && creep.carry.energy < creep.carryCapacity) {
                    if (creep.withdraw(structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        creep.moveTo(structure);
                        return true;
                    }
                }
                
            } else if (job.order == CARRIER_JOBS.PICK_UP) {
                
                if (creep.pickup(structure) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(structure);
                    return true;
                }
                
            }
        }
    } else {
        if (Game.flags[creep.name]) {
            Game.flags[creep.name].remove();
        }
        
        if (!creep.pos.inRangeTo(3, 35, 2)) {
            creep.moveTo(4, 34);
        }
    }
    
    return false;
}

function f_control_carriers(room_data) {
    var n = room_data.carriers.length;
    
    var k = 0;
    for (var i = 0; i < n; ++i) {
        var carrier = Game.creeps[room_data.carriers[k]];
        if (carrier) {
            if (!carrier.spawning) {
                if (!f_control_carrier(carrier)) {
                    carrier.memory.mining.job = null;
                }
            }
            k += 1;
        } else {
            room_data.carriers.splice(k, 1);
        }
    }
    
    return tools.mvalue(room_data.carriers, {u: ttl, c: tools.cmin, i: 0});
}


function f_control(spawn) {
    if (!spawn) return false;
    if (!f_room_initialized(spawn.room)) return false;
    
    var room_data = Memory.mining[spawn.room.name];
    
    var storage = Game.getObjectById(room_data.storage.id);
    if (storage) {
        room_data.storage.fill = storage.store.energy;
    }
    
    var has_miners = false;
    var miners_needed = 0;
    var carriers_needed = false;
    
    for (var i in room_data.sources) {
        var source = Game.getObjectById(i);
        var source_data = room_data.sources[i];
        var container = Game.getObjectById(source_data.container.id);
        source_data.container.fill = container.store.energy;
        var ttl = f_control_miners(source, source_data);
        if (ttl > 0) {
            has_miners = true;
        }
        if (ttl < 60) {
            // 40 ~ 24 spawn time + some time to travel there
            if (source.energy > ttl*12 || source.ticksToRegeneration < Math.max(ttl, 50)) {
                miners_needed += 1;
            }
        }
    }
    
    var carrier_ttl = f_control_carriers(room_data);
    if (room_data.carriers.length == 0 || (room_data.carriers.length == 1 && carrier_ttl < 60)) {
        carriers_needed = true;
    }
    
    
    if (carriers_needed) {
        if (!has_miners) {
            f_spawn_carrier(spawn, 150);
            return true;
        } else if (miners_needed > 0) {
            f_spawn_carrier(spawn, 450);
            return true;
        } else {
            f_spawn_carrier(spawn, 600);
            return true;
        }
    } else if (miners_needed > 0) {
        f_spawn_miner(spawn);
        return true;
    }
    
    
    return false;
}