const MSPC = 'intel_v1';

module.exports = {
    gather: gather,
    get: get
};

function gather(room) {
    if (!Memory[MSPC]) Memory[MSPC] = {};
    if (!Memory[MSPC][room.name]) Memory[MSPC][room.name] = {};

    Memory[MSPC][room.name].time = Game.time;
    var creeps = room.find(FIND_HOSTILE_CREEPS);
    var creep_data = [];
    for (var i = 0; i < creeps.length; ++i) {
        var creep = creeps[i];
        creep_data.push({
            id: creep.id,
            body: creep.body,
            hits: creep.hits,
            ttl: creep.ticksToLive,
            pos: creep.pos,
            owner: creep.owner.username
        });
    }
}

function get(room_name) {
    if (!Memory[MSPC] || !Memory[MSPC][room_name]) return undefined;
    return Memory[MSPC][room_name];
}