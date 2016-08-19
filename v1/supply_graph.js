const TYPES = {
    PATH: 0,
    SINK: 1,
    SOURCE: 2
};

class MyNode {
    constructor() {
        this.flag = 0;
        this.adjacent_path = [];
    }

    get obj() {
        return Game.getObjectById(this.id);
    }

    get isPath() {
        return this.type == TYPES.PATH;
    }

    get isSink() {
        return this.type == TYPES.SINK;
    }
}

MyNode.prototype.forAdjacentPath = function(graph, x, y, pathfun) {
    this.adjacent_path.forEach(function (d) {
        let path = undefined;
        let dir = get_dir(d);
        if (x !== undefined && y !== undefined && graph !== undefined) {
            if (graph[x + dir.dx] !== undefined) {
                path = graph[x + dir.dx][y + dir.dy];
            }
        }
        pathfun(path, dir);
        return;
    });
};

MyNode.prototype.forAdjacentSink = function(graph, x, y, sinkfun)  {
    this.adjacent_sink.forEach(function (d) {
        let sink = undefined;
        let dir = get_dir(d);
        if (x !== undefined && y !== undefined && graph !== undefined) {
            if (graph[x + dir.dx] !== undefined) {
                sink = graph[x + dir.dx][y + dir.dy];
            }
        }
        sinkfun(sink, dir);
        return;
    });
};


class SinkNode extends MyNode {
    constructor(id) {
        super();
        this.type = TYPES.SINK;
        this.id = id;
    }

    get deficit() {
        let o = this.obj;
        return o.energyCapacity - o.energy;
    }
}

class PathNode extends MyNode {
    constructor() {
        super();
        this.adjacent_sink = [];
        this.type = TYPES.PATH;
    }
}

const MS = 'SUPGv2';

module.exports = {
    build_graph: build_graph
};

function get_dir(d) {
    return directions[d - 1];
}

function dir_by_delta(dx, dy) {
    if (dx > 0) {
        if (dy > 0) {
            return BOTTOM_RIGHT;
        } else if (dy < 0) {
            return TOP_RIGHT;
        } else {
            return RIGHT;
        }
    } else if (dx < 0) {
        if (dy > 0) {
            return BOTTOM_LEFT;
        } else if (dy < 0) {
            return TOP_LEFT;
        } else {
            return LEFT;
        }
    } else {
        if (dy > 0) {
            return BOTTOM;
        } else if (dy < 0) {
            return TOP;
        } else {
            return undefined;
        }
    }
}

const directions = [
    {fwd: TOP, rev: BOTTOM, dx: 0, dy: -1},
    {fwd: TOP_RIGHT, rev: BOTTOM_LEFT, dx: 1, dy: -1},
    {fwd: RIGHT, rev: LEFT, dx: 1, dy: 0},
    {fwd: BOTTOM_RIGHT, rev: TOP_LEFT, dx: 1, dy: 1},
    {fwd: BOTTOM, rev: TOP, dx: 0, dy: 1},
    {fwd: BOTTOM_LEFT, rev: TOP_RIGHT, dx: -1, dy: 1},
    {fwd: LEFT, rev: RIGHT, dx: -1, dy: 0},
    {fwd: TOP_LEFT, rev: BOTTOM_RIGHT, dx: -1, dy: -1}
];

const walkable = [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_RAMPART];

function isSink (s) {
    return s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION;
}

function build_graph(room) {
    var sinks = room.find(FIND_MY_STRUCTURES, {filter: isSink});

    var sink_pos = {};
    var graph = {sinks: {}, paths: {}};
    var votes = {};

    // Step 1: All sinks cast votes for adjacent, walkable, non-sink tiles.
    // Votes for tiles that are non-walkable or occupied by sinks are set to 0.
    for (let i = 0; i < sinks.length; ++i) {
        let sink = sinks[i];
        let x = sink.pos.x;
        let y = sink.pos.y;

        sink_pos[sink.id] = {x: x, y: y};

        if (graph.sinks[x] == undefined) graph.sinks[x] = {};
        graph.sinks[x][y] = new SinkNode(sink.id);

        directions.forEach(function (dir) {
            let px = x + dir.dx;
            let py = y + dir.dy;

            if (graph.sinks[px] !== undefined) {
                if (graph.sinks[px][py] !== undefined) {
                    if (votes[px] == undefined) votes[px] = {};
                    votes[px][py] = 0;
                    return;
                }
            }

            if (votes[px] === undefined) votes[px] = {};

            if (votes[px][py] === undefined) {
                let terrain = room.lookForAt(LOOK_TERRAIN, px, py)
                if (terrain == 'plain' || terrain == 'swamp') {
                    let structures = room.lookForAt(LOOK_STRUCTURES, px, py);
                    if (structures.every((s) => walkable.indexOf(s.structureType) >= 0)) {
                        votes[px][py] = 1;
                        return;
                    }
                }
                votes[px][py] = 0;
            } else {
                if (votes[px][py] > 0) votes[px][py] += 1;
            }
        });
    }

    let new_paths = 0;

    // Step 2: Create vertices for tiles that have received at least 3 votes.
    // Establish adjacency for sink-path, and path-path pairs.
    graphLoop(votes, function (n, x, y) {
        if (n < 3) return;

        let node = new PathNode();
        node.flag = 2;

        let accessible = false;

        directions.forEach(function (dir) {
            let px = x + dir.dx;
            let py = y + dir.y;

            // Mark this tile as accessible if any neighbor tile has a non-zero amount of votes.
            if (!accessible && votes[px] !== undefined && votes[px][py] > 0) accessible = true;

            if (graph.sinks[px] !== undefined) {
                let sink = graph.sinks[px][py];
                if (sink !== undefined) {
                    node.adjacent_sink.push(dir.fwd);
                    return;
                }
            }
            if (graph.paths[px] !== undefined) {
                let path = graph.paths[px][py];
                if (path !== undefined) {
                    node.adjacent_path.push(dir.fwd);
                }
            }
        });

        if (accessible) {

            node.forAdjacentPath(graph.paths, x, y, function(path, dir2) {
                path.adjacent_path.push(dir2.rev);
            });
            node.forAdjacentSink(graph.sinks, x, y, function(sink, dir2) {
                sink.adjacent_path.push(dir2.rev);
                delete sink_pos[sink.id];
            });

            if (graph.paths[x] === undefined) graph.paths[x] = {};
            graph.paths[x][y] = node;

            new_paths += 1;

        } else {

            // If the path is inaccessible, clear votes, to avoid rechecking this tile in further steps.
            votes[x][y] = 0;
        }
    });

    let frontier = [];
    let new_frontier = [];

    // Step 3: Incrementally add paths that are adjacent to sinks that are currently not reachable
    // and are adjacent to paths that are already in the graph.
    while (new_paths > 0) {

        new_frontier.forEach(function(pos) {
            graph.paths[pos.x][pos.y].flag = 2;
        });

        frontier = new_frontier;
        new_frontier = [];
        frontier = [];
        new_paths = 0;

        for (let id in sink_pos) {
            let pos = sink_pos[id];
            let x = pos.x;
            let y = pos.y;
            directions.forEach(function (dir) {
                let px = x + dir.dx;
                let py = y + dir.dy;
                if (votes[px][py] == 0) return;
                let node = new PathNode();

                if (frontier.length == 0 || frontier.length > 8) {

                    // Find path vertices in the nodes neighborhood.
                    // If any of them are pre-existing (3 votes or more, as denoted by flag == 2),
                    // This node should be added to the graph (denoted by flag == 1).
                    directions.forEach(function (dir2) {
                        let ppx = px + dir2.dx;
                        let ppy = py + dir2.dy;
                        if (graph.paths[ppx] !== undefined) {
                            let path = graph.paths[ppx][ppy];
                            if (path !== undefined) {
                                node.adjacent_path.push(dir.fwd);
                                if (path.flag == 2) node.flag = 1;
                            }
                        }
                    });

                } else {

                    frontier.forEach(function (pos) {

                        let dx = pos.x - px;
                        let dy = pos.y - py;
                        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                            let dir = get_dir(dir_by_delta(dx, dy));
                            node.adjacent_path.push(dir.fwd);
                            node.flag = 1;
                        }

                    });
                }

                // Find sink neighbors, establish adjacency with these as well as path neighbors and
                // finally add the node to the graph.
                if (node.flag == 1) {

                    directions.forEach(function (dir3) {
                        let ppx = px + dir3.dx;
                        let ppy = py + dir3.dy;
                        if (graph.sinks[ppx] !== undefined) {
                            let sink = graph.sinks[ppx][ppy];
                            if (sink !== undefined) {
                                node.adjacent_sink.push(dir.fwd);
                                sink.adjacent_path.push(dir.rev);
                            }
                        }
                    });

                    node.forAdjacentPath(graph.paths, px, py, function(path, dir4) {
                        path.adjacent_path.push(dir4.rev);
                    });

                    graph.paths[px][py] = node;
                    delete(sink_pos[id]);

                    new_frontier.push({x: px, y: py});
                    new_paths += 1;
                }
            });
        }
    }

    if (!Memory[MS]) Memory[MS] = {};
    Memory[MS][room.name] = graph;
}

function graphLoop(graph, nodefun) {
    for (let sx in graph) {
        let x = parseInt(sx);
        for (let sy in graph[sx]) {
            let y = parseInt(sy);
            let v = graph[sx][sy];
            if (nodefun(v, x, y) === 0) return;
        }
    }
}

function updateGraph (room) {
    if (!Memory[MS]) return;
    if (!Memory[MS][room.name]) return;

    var graph = Memory[MS][room.name];

    // Clear Path flags
    graphLoop(graph.paths, function (v) {
        v.flag = 0;
    });

    let sink_pos = {};

    let flags = [];

    room.find(FIND_MY_STRUCTURES, {filter: (s) => isSink(s) && s.energy < s.energyCapacity}).forEach(function (s) {
        let x = s.pos.x;
        let y = s.pos.y;
        sink_pos[s.id] = {x: x, y: y};
        let v = graph.sinks[x][y];
        v.adjacent_path.forEach(function (d) {
            let dir = get_dir(d);
            graph.paths[x + dir.dx][y + dir.dy].flag += 1;
        });
        if (v.adjacent_path.length == 1) {
            let dir = get_dir(v.adjacent_path[0]);
            graph.paths[x + dir.dx][y + dir.dy].flag |= 0b1000;
        }
    });

    graphLoop(graph.paths, function (v, x, y) {
        if (v.flag > 0) {
            flags.push({x: x, y: y});
        }
    });
    flags.sort((a, b) => graph.paths[b.x][b.y].flag - graph[a.x][a.y].flag);


}

function createRoute (room, pos, energy) {
    if (!Memory[MS]) return undefined;
    if (!Memory[MS][room.name]) return undefined;

    var graph = Memory[MS][room.name];
    var x = pos.x;
    var y = pos.y;

    let v = graph[x][y];
    if (v.isSink()) {

    }
}