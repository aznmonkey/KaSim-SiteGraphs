/*jshint esversion: 6*/

/* Contains classes required for the SiteGraph visualization */

class Dimension {
    constructor (width, height) {
        this.width = width;
        this.height = height;
    }

    add(dimension) {
        this.width += dimension.width;
        this.height += dimension.height;
    }

    scale(s) {
        this.width *= s;
        this.height *= s;
    }

    update(dimension) {
        console.log(dimension);
        this.height = dimension.height;
        this.width = dimension.width;
    }

    
}

class D3Object {
    constructor(label) {
        this.label = label;
        this.dimension = new Dimension(0, 0);
        this.contentDimension = new Dimension(0, 0);
    }
    
    anchor(point) {
        //console.log(this.dimension);
        let newPoint = this.dimension.toPoint();
        newPoint.scale(-0.5);
        newPoint.translate(point, translate.ADD);
        return newPoint;
    }

    setDimension(dimension) {
        this.dimension = dimension;
    }

    getDimension() {
        return this.dimension;
    }
}

class Site extends D3Object {
    constructor (siteData, agent) {
        super(siteData.site_name);
        this.links = siteData.site_links.map(function(link)
            { 
                return new SiteLink(link[0],link[1]); 
            });
        this.agent = agent;
        this.states = siteData.site_states;
        this.currentState = null;
        this.startAngle = 0;
        this.endAngle = 0;
    }
    
    setId(id) {
        this.id = id;
    }
    setCurrentState(state) {
        this.state = state;
    }

    listLinks() {
        return this.links;
    }

    getAgent() {
        return this.agent;
    }

    setAngles(startAngle, endAngle) {
        this.startAngle = startAngle;
        this.endAngle = endAngle;
    }

    getAngle() {
        return (this.startAngle + this.endAngle)/2;
    }
    cartX (r) {
        //console.log(this.startAngle);
        return r * Math.cos(((this.startAngle + this.endAngle)/2 + 3 * Math.PI/2));

    }
    cartY (r) {
        return r * Math.sin(((this.startAngle + this.endAngle)/2 + 3 * Math.PI/2));
    }
}

class Node extends D3Object {
    constructor (nodeData) {
        super(nodeData.site_node_name);
        let node = this;
        this.sites = nodeData.site_node_sites.map(function(siteData, i) {
            let site = new Site(siteData, node);
            site.setId(i); 
            return site;
        });
    }
    
    setId(id) {
        this.id = id;
    }

    listSites() {
        return this.sites;
    }

    getSite(siteId) {
        return this.listSites()[siteId];
    }
}

class SiteLink {
    constructor(nodeId, siteId) {
        this.nodeId = nodeId;
        this.siteId = siteId;
    }

    equals(otherLink) {
        return otherLink.nodeId == this.nodeId && otherLink.siteId == this.siteId;
    }

}

class DataStorage {
    constructor(data, isSnapshot) {
        if(!data) {return null;} /* check that there is data*/
        this.nodeCount = data.length;
        this.isSnapshot = isSnapshot;
        var tempData = [];
        Object.keys(data).forEach(function(nodeData, i) {
            let node = new Node(data[nodeData]);
            node.setId(i);
            tempData.push(node);
        });
        this.data = tempData;
        
    }

    getNode(id) {
        return this.data[id];
    }

    listNodes() {
        return this.data;
    }

    getSite(node, s) {
        return this.getNode(node).getSite(s);
    }

    // layout of sites
    siteDistance(site, point) {
        let distances = site.listLinks().map(function(link) {
            let nodeLocation = this.getNode(link.nodeId).absolute;
            return nodeLocation.distance(point);
        });
        let result = distances.reduce(function(a,b){ 
            return a + b; }, 0);
        return result;
    }
}

