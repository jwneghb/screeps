var tools = require('tools');
var book_keeping = require('book_keeping');

module.exports = {
    control: control,
    init: initialize_room,
    assign: assign_miner
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

var init_W41N24 = [
    {
        id: '577b92fa0f9d51615fa47751',
        rel: RIGHT
    },
    {
        id: '577b92fa0f9d51615fa47753',
        rel: TOP_LEFT
    }
];

var init_W42N25 = [
    {
        id: '577b92ec0f9d51615fa47604',
        rel: BOTTOM_RIGHT
    },
    {
        id: '577b92ec0f9d51615fa47605',
        rel: TOP_LEFT
    }
];

var init_settings = {
    W42N24: init_W42N24,
    W42N25: init_W42N25
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

function room_initialized(room_name) {
    return !(!Memory[memspace] || !Memory[memspace][room_name]);
}

function initialize_room(room) {
    if (!room) return 'ROOM_NOT_FOUND';

    if (!init_settings[room.name]) return 'SOURCE_SETTINGS_MISSING';
    if (!Memory[memspace]) Memory[memspace] = {};

    var room_data = {sources: []};

    var settings = init_settings[room.name];

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
                creep.moveTo(source_data.container.pos.x, source_data.container.pos.y);
                if (creep.room.name == c.pos.roomName) {
                    creep.moveTo(c.pos.x, c.pos.y);
                } else {
                    creep.moveTo(creep.pos.findClosestByPath(creep.room.findExitTo(c.pos.roomName)));
                }
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
    book_keeping.income(RESOURCE_ENERGY, income);
    return ttl;
}

function control(room_name) {
    var room = Game.rooms[room_name];

    if (!room) {
      if (Memory[memspace][room_name]) {
          var room_data = Memory[memspace][room.name];
          var ttl = [];
          for (var i = 0; i < room_data.sources.length; ++i) {
              var source_data = room_data.sources[i];
              ttl.push(control_miners(source_data));
          }
          return ttl;
      } else {
          return undefined;
      }
    }

    var room_data = Memory[memspace][room.name];
    var ttl = [];
    for (var i = 0; i < room_data.sources.length; ++i) {
        var source_data = room_data.sources[i];
        if (!Game.getObjectById(source_data.container.id)) {
            var co = find_container(source_data.container.pos);
            if (!co) {
                var err = room.createConstructionSite(source_data.container.pos, STRUCTURE_CONTAINER);
                if (err == OK) {
                    co = find_container(room_data.sources[i].container.pos);
                } else {
                    console.log(err);
                }
            }
            if (co) {
                if (co.isStructure) {
                    source_data.container.id = co.structure.id;
                    source_data.container.isConstructed = true;
                } else {
                    source_data.container.id = co.site.id;
                    source_data.container.isConstructed = false;
                }
            }
        }
        ttl.push(control_miners(source_data));
    }

    return ttl.sort();
}