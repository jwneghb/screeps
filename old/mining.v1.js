module.exports = {
    setup: setup
};

const MSPC = 'mining_v1';

function available_pos (room, pos) {
    let swamp = undefined;
    for (let x = -1; x <= 1; ++x) {
        for (let y = -1; y <= 1; ++y) {
            if (x != 0 || y != 0) {
                let t = room.lookForAt(LOOK_TERRAIN, pos.x + x, pos.y + y);
                if (t == 'plain') {
                    return room.getPositionAt(pos.x + x, pos.y + y);
                } else if (t == 'swamp') {
                    swamp = room.getPositionAt(pos.x + x, pos.y + y);
                }
            }
        }
    }
    return swamp;
}

function relative_pos(room, pos, rel) {
    let x = pos.x;
    let y = pos.y;
    let dx = 0, dy = 0;
    if (rel == TOP || rel == TOP_RIGHT || rel == TOP_LEFT) dy = -1;
    if (rel == BOTTOM || rel == BOTTOM_RIGHT || rel == BOTTOM_LEFT) dy = 1;
    if (rel == LEFT || rel == TOP_LEFT || rel == BOTTOM_LEFT) dx = -1;
    if (rel == RIGHT || rel == TOP_RIGHT || rel == BOTTOM_RIGHT) dx = 1;
    return room.getPositionAt(x+dx, y+dy);
}

function setup () {
    Room.prototype.mining_init = function(parameters) {
        let room_data = {sources: []};

        let sources = this.find(FIND_SOURCES);
        for (var i = 0; i < sources.length; ++i) {
            var s = sources[i];
            var source_data = {};
            if (parameters) {
                if (parameters.exclude && parameters.exclude.indexOf(s.id)) continue;
                if (parameters.relative) {
                    let k = Object.keys(parameters.relative);
                    for (let j = 0; j < k.length; ++j) {
                        if (s.id.substr(s.id.length - k[j].length, k[j].length)) {
                            source_data.container = {pos: relative_pos(this, s.pos, parameters.relative[k[j]])};
                        }
                    }
                }
                if (!source_data.container) source_data.container = {pos: available_pos(this, s.pos)};
            }
        }

        if (!Memory[MSPC]) Memory[MSPC] = {};
        Memory[MSPC][this.name] = room_data;
    }
}



