var tools = require('tools');

module.exports = {
    control: control,
    init: initialize_room,
    assign: assign_miner,
    fill: total_fill,
    active: actively_mining
};

var memspace = 'new_mining';

function rel_pos(pos, rel) {
    var x = pos.x;
    var y = pos.y;
    var dx = 0, dy = 0;
    if (rel == TOP || rel == TOP_RIGHT || rel == TOP_LEFT) dy = -1;
    if (rel == BOTTOM || rel == BOTTOM_RIGHT || rel == BOTTOM_LEFT) dy = 1;
    if (rel == LEFT || rel == TOP_LEFT || rel == BOTTOM_LEFT) dx = -1;
    if (rel == RIGHT || rel == TOP_RIGHT || rel == BOTTOM_RIGHT) dx = 1;
    return new RoomPosition(x+dx, y+dy, pos.roomName);
}

function ttl(creep_name) {
    var creep = Game.creeps[creep_name];
    return creep ? creep.ticksToLive : 0;
}

function room_initialized(room_name) {
    return !(!Memory[memspace] || !Memory[memspace][room_name]);
}

function find_position(source, placement) {
    if (placement && placement[source.id]) {
        return rel_pos(source.pos, placement[source.id]);
    } else {
        var swamp = null;
        for (var x = -1; x <= 1; ++x) {
            for (var y = -1; y <= 1; ++y) {
                if (x != 0 || y != 0) {
                    var terrain = source.room.lookForAt(LOOK_TERRAIN, x, y);
                    if (terrain == 'plain') return new RoomPosition(x, y, source.room.name);
                    if (!swamp && terrain == 'swamp') swamp = new RoomPosition(x, y, source.room.name);
                }
            }
        }
        return swamp;
    }
}

function initialize_room(room, container_placement) {
    if (!room) return 'ROOM_NOT_FOUND';

    if (!Memory[memspace]) Memory[memspace] = {};

    var room_data = {sources: []};

    var sources = room.find(FIND_SOURCES);
    for (var i = 0; i < sources.length; ++i) {
        var id = sources[i].id;
        var cpos = find_position(sources[i], container_placement);

        var source_data = {
            id: id,
            miners: [],
            container: {pos: cpos}
        };

        room_data.sources.push(source_data);
    }

    Memory[memspace][room.name] = room_data;

    return 'OK';
}

function find_container(position) {
    var structures = Game.rooms[position.roomName].lookForAt(LOOK_STRUCTURES, position.x, position.y);
    structures = _.filter(structures, (s) => s.structureType == STRUCTURE_CONTAINER);
    if (structures.length > 0) {
        return {isStructure: true, structure: structures[0]};
    }
    var constructions = Game.rooms[position.roomName].lookForAt(LOOK_CONSTRUCTION_SITES, position.x, position.y);
    constructions = _.filter(constructions, (c) => c.my && c.structureType == STRUCTURE_CONTAINER);
    if (constructions.length > 0) {
        return {isStructure: false, site: constructions[0]};
    }
    return undefined;
}

function assign_miner(creep, room_name) {
    if (!creep) return false;
    if (!room_initialized(room_name)) return false;

    var room_data = Memory[memspace][room_name];

    var idx = tools.mindex(room_data.sources, {
        u: (s) => tools.mvalue(s.miners, {u: ttl, c: tools.cmax, i: 0})
    });

    if (idx < 0) return false;

    room_data.sources[idx].miners.push(creep.name);
    creep.memory.role = 'miner';
    creep.memory.work = _.filter(creep.body, (p) => p.type == WORK).length;
    return true;
}

function control_miner(creep, source_data, isFirst) {
    if (!creep.spawning) {
        var c = source_data.container;
        if (isFirst) {
            if (creep.pos.inRangeTo(c.pos, 0)) {
                var source = Game.getObjectById(source_data.id);
                var container = Game.getObjectById(c.id);
                let mining_power = 2 * creep.memory.work;

                if (creep.carryCapacity > 0) {
                    if (creep.carry.energy >= creep.memory.work) {
                        if (container) {
                            if (!c.isConstructed) {
                                creep.build(container);
                                return 0;
                            } else if (container.hits <= container.hitsMax - creep.memory.work * 100) {
                                creep.repair(container);
                                return 0;
                            }
                        }
                    }
                }

                if (!container || !c.isConstructed || container.storeCapacity - container.store.energy >= mining_power ||
                    container.hits <= container.hitsMax - creep.memory.work * 100)
                {
                    if (creep.harvest(source) == OK) {
                        return Math.min(source.energy, mining_power);
                    }
                }
            } else {
                creep.moveTo(new RoomPosition(c.pos.x, c.pos.y, c.pos.roomName));
            }
        } else {
            if (creep.pos.inRangeTo(c.pos, 0)) {
                // Stop blocking the spot
                creep.move(Math.floor(Math.random() * 8) + 1);
            } else if (!creep.pos.inRangeTo(c.pos, 1)) {
                if (creep.room.name == c.pos.roomName) {
                    creep.moveTo(c.pos.x, c.pos.y);
                } else {
                    creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(c.pos.roomName)));
                }
            }
        }
    }
    return 0;
}

function control_miners(source_data) {
    var n = source_data.miners.length;
    var k = 0;
    var ttl = 0;
    var income = 0;
    for (var i = 0; i < n; ++i) {
        var creep = Game.creeps[source_data.miners[k]];
        if (creep) {
            income += control_miner(creep, source_data, k == 0);
            if (ttl < creep.ticksToLive) ttl = creep.ticksToLive;
            k += 1;
        } else {
            source_data.miners.splice(k, 1);
        }
    }
    return ttl;
}

function actively_mining(room_name) {
    if (!room_initialized(room_name)) return [];
    var miners_at = [];
    var room_data = Memory[memspace][room_name];
    for (var i = 0; i < room_data.sources.length; ++i){
        var source_data = room_data.sources[i];
        if (source_data.miners.length > 0) {
            miners_at.push(source_data.container.pos)
        }
    }
    return miners_at;
}

function total_fill(room_name) {
    if (!room_initialized(room_name)) return 0;
    var ret = 0;
    var room_data = Memory[memspace][room_name];
    for (var i = 0; i < room_data.sources.length; ++i) {
        var source_data = room_data.sources[i];
        ret += source_data.container.fill || 0;
    }
    return ret;
}

function control(room_name) {
    if (!room_initialized(room_name)) return undefined;

    var room = Game.rooms[room_name];

    if (!room) {
        let room_data = Memory[memspace][room_name];
        let ttl = [];
        for (let i = 0; i < room_data.sources.length; ++i) {
            let source_data = room_data.sources[i];
            ttl.push(control_miners(source_data));
        }
        return ttl.sort();
    }

    var room_data = Memory[memspace][room.name];
    var ttl = [];
    for (var i = 0; i < room_data.sources.length; ++i) {
        var source_data = room_data.sources[i];
        var container = Game.getObjectById(source_data.container.id);
        if (!container) {
            var co = find_container(source_data.container.pos);
            if (!co) {
                var err = room.createConstructionSite(source_data.container.pos.x, source_data.container.pos.y, STRUCTURE_CONTAINER);
                if (err == OK) {
                    co = find_container(room_data.sources[i].container.pos);
                } else {
                    console.log('[room_mining] Cannot create site! ' + err);
                }
            }
            if (co) {
                if (co.isStructure) {
                    source_data.container.id = co.structure.id;
                    source_data.container.isConstructed = true;
                    source_data.container.fill = co.structure.store.energy || 0;
                } else {
                    source_data.container.id = co.site.id;
                    source_data.container.isConstructed = false;
                    source_data.container.fill = 0;
                }
            }
        } else if (source_data.container.isConstructed) {
            source_data.container.fill = container.store.energy;
        }
        ttl.push(control_miners(source_data));
    }

    return ttl.sort();
}