class MyNode {
    static types = {
        PATH: 'path',
        SINK: 'sink',
        SOURCE: 'source'
    };

    constructor(x, y) {
        this.position.x = x;
        this.position.y = y;
    }

    position = {};
    id = undefined;
    type = undefined;

    adjacent_path = {};
    adjacent_source = {};
    adjacent_sink = {};

    obj = function() {
        return Game.getObjectById(this.id);
    }

    isPath = function() {
        return this.type == MyNode.types.PATH;
    }

    isSink = function() {
        return this.type == MyNode.types.SINK;
    }

    isSource = function() {
        return this.type == MyNode.types.SOURCE;
    }
}

class SinkNode extends MyNode {
    constructor(x, y, id) {
        super(x, y);
        this.type = 'sink';
        this.id = id;
    }
}

class PathNode extends MyNode {
    constructor(x, y) {
        super(x, y);
        this.type = 'path';
    }
}

const MS = 'SUPGv2';

const rel = {};
rel[TOP] = [0, -1];
rel[TOP_RIGHT] = [1, -1];
rel[RIGHT] = [1, 0];
rel[BOTTOM_RIGHT] = [1, 1];
rel[BOTTOM] = [0, 1];
rel[BOTTOM_LEFT] = [-1, 1];
rel[LEFT] = [-1, 0];
rel[TOP_LEFT] = [-1, -1];

const opposite = {};
opposite[TOP] = BOTTOM;
opposite[TOP_RIGHT] = BOTTOM_LEFT;
opposite[RIGHT] = LEFT;
opposite[BOTTOM_RIGHT] = TOP_LEFT;
opposite[BOTTOM] = TOP;
opposite[BOTTOM_LEFT] = TOP_RIGHT;
opposite[LEFT] = RIGHT;
opposite[TOP_LEFT] = BOTTOM_RIGHT;

const walkable = [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_RAMPART];

function build_graph(room) {
    var sinks = room.find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION});

    var sink_pos = {};
    var graph = {};
    var votes = {};

    for (let i = 0; i < sinks.length; ++i) {
        let sink = sinks[i];
        let x = sink.pos.x;
        let y = sink.pos.y;
        sink_pos[sink.id] = {x: x, y: y};
        if (graph[x] == undefined) graph[x] = {};
        graph[x][y] = new SinkNode(x, y, sink.id);
        for (let j = TOP; j <= TOP_LEFT; ++j) {
            let px = x + rel[j][0];
            let py = y + rel[j][1];
            if (votes[px] === undefined || votes[px][py] === undefined) {
                let terrain = room.lookForAt(LOOK_TERRAIN, px, py)
                if (terrain == 'plain' || terrain == 'swamp') {
                    let structures = room.lookForAt(LOOK_STRUCTURES, px, py);
                    if (structures.every((s) => walkable.indexOf(s.structureType) >= 0)) {
                        if (votes[px] === undefined) votes[px] = {};
                        votes[px][py] = 1;
                    }
                }
            } else {
                votes[px][py] += 1;
            }
        }
    }

    for (let sx in votes) {
        let x = parseInt(sx);
        for (let sy in votes[x]) {
            let y = parseInt(sy);
            if (votes[x][y] > 2) {
                let node = new PathNode(x, y);
                for (let i = TOP; i <= TOP_LEFT; ++i) {
                    let px = x + rel[i][0];
                    let py = y + rel[i][1];
                    if (graph[px]) {
                        let adjacent = graph[px][py];
                        if (adjacent) {
                            if (adjacent.isSink()) {
                                node.adjacent_sink[i] = adjacent;
                                delete sink_pos[adjacent.id];
                            }
                            if (adjacent.isPath()) node.adjacent_path[i] = adjacent;
                            if (adjacent.isSource()) node.adjacent_source[i] = adjacent;
                            adjacent.adjacent_path[opposite[i]] = node;
                        }
                    }
                }
                if (graph[x] === undefined) graph[x] = {};
                graph[x][y] = node;
            }
        }
    }

    if (!Memory[MS]) Memory[MS] = {};
    Memory[MS][room.name] = graph;
}