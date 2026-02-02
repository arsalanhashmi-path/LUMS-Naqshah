/**
 * Campus Pathfinding Module
 * Builds a routing graph from GeoJSON LineStrings and implements A* algorithm
 */

// Simple priority queue for A*
class PriorityQueue {
  constructor() {
    this.items = [];
  }
  enqueue(element, priority) {
    this.items.push({ element, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  dequeue() {
    return this.items.shift()?.element;
  }
  isEmpty() {
    return this.items.length === 0;
  }
}

// Calculate distance between two [lng, lat] coordinates (Haversine)
function haversineDistance(coord1, coord2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const lat1 = toRad(coord1[1]);
  const lat2 = toRad(coord2[1]);
  const dLat = toRad(coord2[1] - coord1[1]);
  const dLng = toRad(coord2[0] - coord1[0]);
  
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

// Convert coord array to string key
function coordToKey(coord) {
  return `${coord[0].toFixed(7)},${coord[1].toFixed(7)}`;
}

// Parse key back to coord
function keyToCoord(key) {
  const [lng, lat] = key.split(',').map(Number);
  return [lng, lat];
}

/**
 * Build a graph from GeoJSON features
 * @param {Array} features - GeoJSON features array
 * @returns {Object} graph - Adjacency list { nodeKey: [{ node: nodeKey, cost: meters }] }
 */
export function buildGraph(features) {
  const graph = {};
  
  features.forEach((feature) => {
    // Only process LineStrings (paths/roads)
    if (feature.geometry?.type !== 'LineString') return;
    
    const coords = feature.geometry.coordinates;
    
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const key1 = coordToKey(p1);
      const key2 = coordToKey(p2);
      const dist = haversineDistance(p1, p2);
      
      // Initialize nodes if needed
      if (!graph[key1]) graph[key1] = [];
      if (!graph[key2]) graph[key2] = [];
      
      // Add bidirectional edges
      graph[key1].push({ node: key2, cost: dist });
      graph[key2].push({ node: key1, cost: dist });
    }
  });
  
  return graph;
}

/**
 * Find the nearest graph node to a given coordinate
 * @param {Array} coord - [lng, lat]
 * @param {Object} graph - The routing graph
 * @returns {string} - The key of the nearest node
 */
export function findNearestNode(coord, graph) {
  let nearestKey = null;
  let minDist = Infinity;
  
  for (const key of Object.keys(graph)) {
    const nodeCoord = keyToCoord(key);
    const dist = haversineDistance(coord, nodeCoord);
    if (dist < minDist) {
      minDist = dist;
      nearestKey = key;
    }
  }
  
  return nearestKey;
}

/**
 * A* Pathfinding Algorithm
 * @param {Object} graph - Adjacency list
 * @param {string} startKey - Start node key
 * @param {string} endKey - End node key
 * @returns {Array} - Array of [lng, lat] coordinates forming the path, or null if no path
 */
export function aStar(graph, startKey, endKey) {
  if (!graph[startKey] || !graph[endKey]) {
    console.warn('Start or end node not in graph');
    return null;
  }
  
  const endCoord = keyToCoord(endKey);
  
  const openSet = new PriorityQueue();
  const cameFrom = {};
  const gScore = { [startKey]: 0 };
  const fScore = { [startKey]: haversineDistance(keyToCoord(startKey), endCoord) };
  
  openSet.enqueue(startKey, fScore[startKey]);
  const inOpenSet = new Set([startKey]);
  
  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    inOpenSet.delete(current);
    
    if (current === endKey) {
      // Reconstruct path
      const path = [];
      let node = current;
      while (node) {
        path.unshift(keyToCoord(node));
        node = cameFrom[node];
      }
      return path;
    }
    
    for (const neighbor of graph[current] || []) {
      const tentativeG = gScore[current] + neighbor.cost;
      
      if (tentativeG < (gScore[neighbor.node] ?? Infinity)) {
        cameFrom[neighbor.node] = current;
        gScore[neighbor.node] = tentativeG;
        fScore[neighbor.node] = tentativeG + haversineDistance(keyToCoord(neighbor.node), endCoord);
        
        if (!inOpenSet.has(neighbor.node)) {
          openSet.enqueue(neighbor.node, fScore[neighbor.node]);
          inOpenSet.add(neighbor.node);
        }
      }
    }
  }
  
  console.warn('No path found');
  return null;
}

/**
 * Calculate centroid of a polygon feature
 * @param {Object} feature - GeoJSON feature
 * @returns {Array} - [lng, lat]
 */
export function getCentroid(feature) {
  if (!feature?.geometry) return null;
  
  let coords = feature.geometry.coordinates;
  if (feature.geometry.type === 'Polygon') {
    coords = coords[0];
  } else if (feature.geometry.type === 'MultiPolygon') {
    coords = coords[0][0];
  } else {
    return null;
  }
  
  let sumLng = 0, sumLat = 0, count = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
    count++;
  }
  
  if (count === 0) return coords[0] || [0, 0];
  return [sumLng / count, sumLat / count];
}

/**
 * Find route between two building features
 * @param {Object} startFeature - Start building
 * @param {Object} endFeature - End building
 * @param {Object} graph - Routing graph
 * @returns {Object} - GeoJSON LineString or null
 */
export function findRoute(startFeature, endFeature, graph) {
  const startCentroid = getCentroid(startFeature);
  const endCentroid = getCentroid(endFeature);
  
  if (!startCentroid || !endCentroid) {
    console.warn('Could not get centroids');
    return null;
  }
  
  const startNode = findNearestNode(startCentroid, graph);
  const endNode = findNearestNode(endCentroid, graph);
  
  if (!startNode || !endNode) {
    console.warn('Could not find nearest nodes');
    return null;
  }
  
  const path = aStar(graph, startNode, endNode);
  
  if (!path) return null;
  
  // Add building centroids to the path for complete visualization
  const fullPath = [startCentroid, ...path, endCentroid];
  
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: fullPath
    },
    properties: {
      from: startFeature.properties?.name || 'Start',
      to: endFeature.properties?.name || 'End'
    }
  };
}
