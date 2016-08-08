var tools = require('tools');

module.exports = {
    run: run,
    init: initialize_room
};

var memspace = 'new_mining';

var init_W42N24 = [
    {
        id: '577b92ec0f9d51615fa47608',
        rel: TOP
    },
    {
        id: '577b92ec0f9d51615fa47609',
        rel: TOP
    }
];

var init_settings = {
    W42N24: init_W42N24
};

function rel_pos(pos, rel) {
    var x = pos.x;
    var y = pos.y;
    var dx = 0, dy = 0;
    if (rel == TOP || rel == TOP_RIGHT || rel == TOP_LEFT) dy = -1;
    if (rel == BOTTOM || rel == BOTTOM_RIGHT || rel == BOTTOM_LEFT) dy = 1;
    if (rel == LEFT || rel == TOP_LEFT || rel == BOTTOM_LEFT) dx = -1;
    if (rel == RIGHT || rel == TOP_RIGHT || rel == BOTTOM_RIGHT) dx = 1;
    return Game.rooms[pos.roomName].getPositionAt(x+dx, y+dy);
}

function ttl(creep_name) {
    var creep = Game.creeps[creep_name];
    return creep ? creep.ticksToLive : 0;
}

function room_initialized(room) {
    if (!room) return false;
    return !(!Memory[memspace] || !Memory[memspace][room.name]);
}

function initialize_room(room) {
    if (!room) return 'ROOM_NOT_FOUND';

    if (!init_settings[room_name]) return 'SOURCE_SETTINGS_MISSING';
    if (!Memory[memspace]) Memory[memspace] = {};

    var room_data = {sources: []};

    var settings = init_settings[room_name];
    let structs = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_STORAGE});
    if (structs.length > 0) {
        room_data.storage = structs[0].id;
    } else {
        return 'STORAGE_NOT_FOUND';
    }

    for (var i = 0; i < settings.length; ++i) {
        var source_data = {
            id: settings[i].id,
            miners: [],
            container: {}
        };
        var source = Game.getObjectById(source_data.id);
        if (!source) {
            return 'SOURCE_NOT_FOUND';
        }

        source_data.container.pos = rel_pos(source.pos, settings[i].rel);

        console.log(source.pos);
        console.log(source_data.container.pos);

        let structs = _.filter(room.lookForAt(LOOK_STRUCTURES, source_data.container.pos),
            (s) => s.structureType == STRUCTURE_CONTAINER);
        if (structs.length > 0) {
            source_data.container.id = structs[0].id;
        } else {
            return 'CONTAINER_NOT_FOUND';
        }

        room_data.sources.push(source_data);
    }

    Memory[memspace][room_name] = room_data;

    return 'OK';
}

function assign_miner(creep, room) {
    if (!creep) return false;
    if (!room_initialized(room)) return false;

    var room_data = Memory[memspace][room.name];

    var idx = tools.mindex(room_data.sources, {
        u: (s) => tools.mvalue(s.miners, {u: ttl, c: tools.cmax, i: 0})
    });

    if (idx < 0) return false;

    room_data.sources[idx].miners.push(creep.name);
    creep.memory.role = 'miner';
    creep.memory.mining_power = 2 * _.filter(creep.body, (p) => p.type == WORK).length;
    return true;
}

function control_miner(creep, source_data, isFirst) {
    if (!creep.spawning) {
        var c = source_data.container;
        if (isFirst) {
            if (creep.pos.inRangeTo(c.pos, 0)) {
                var source = Game.getObjectById(source_data.id);
                var container = Game.getObjectById(c.id);
                if (container.store.energy <= (2000 - creep.memory.mining_power) ||
                    source.energy > (creep.memory.mining_power * source.ticksToRegeneration || 0))
                {
                    if (creep.harvest(source) == OK) {
                        return Math.min(source.energy, creep.memory.mining_power);
                    }
                }
            } else {
                creep.moveTo(c.pos);
            }
        } else {
            if (creep.pos.inRangeTo(c.pos, 0)) {
                creep.move(Math.floor(Math.random() * 8) + 1);
            } else if (!creep.pos.inRangeTo(c.pos, 1)) {
                creep.moveTo(source_data.container.pos);
            }
        }
    }
    return 0;
}

function control_miners(source_data) {
    var n = source_data.miners.length;
    var k = 0;
    var ttl = 0;
    for (var i = 0; i < n; ++i) {
        var creep = Game.creeps[source_data.miners[k]];
        if (creep) {
            control_miner(creep, source_data, k == 0);
            if (ttl < creep.ticksToLive) ttl = creep.ticksToLive;
            k += 1;
        } else {
            source_data.miners.splice(k, 1);
        }
    }
    return ttl;
}

/*
 function source_diff(source_data) {
 var container = Game.getObjectById(source_data.container.id);
 if (container.store.energy > source_data.container.max) {
 return container.store.energy - source_data.container.max;
 }
 if (container.store.energy < source_data.container.min) {
 return container.store.energy - source_data.container.min;
 }
 return 0;
 }

 function diff(room) {
 if (!room_initialized(room)) return undefined;
 var room_data = Memory[memspace][room.name];
 var ret = [];
 for (var i = 0; i < room_data.sources.length; ++i) {
 let d = source_diff(room_data.sources[i]);
 if (d > 0) {
 ret.push({
 id: room_data.sources[i].container.id,
 diff: d
 });
 }
 }
 return ret;
 }
 */

function run(room) {
    if (!room_initialized(room)) return undefined;

    var room_data = Memory[memspace][room.name];
    var ttl = []
    for (var i = 0; i < room_data.sources.length; ++i) {
        ttl.push(control_miners(room_data.sources[i]));
    }

    return ttl.sort();
}