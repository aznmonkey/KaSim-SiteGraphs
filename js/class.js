/*jshint esversion: 6*/

/* Contains classes required for the SiteGraph visualization */

class Dimension {
    constructor (height, width) {
        this.width = width;
        this.height = height;
    }

    add(dimension) {
        this.width += dimension.width;
        this.height += dimension.height;
    }

    scale(s) {
        this.x *= s;
        this.y *= s;
    }

    update(dimension) {
        this.height = dimension.height;
        this.width = dimension.width;
    }

    toPoint(x,y) {
        return new Point(this.width, this.height);
    }

    larger(dimension) {
        let result =
        (this.height > dimension.height) &&
            (this.width > dimension.width);
        return result;
    }

    min(dimension) {
        let minWidth = (this.width < dimension.width) ? this.width : dimension.width;
        let minHeight = (this.height < dimension.height) ? this.height : dimension.height;
        return new Dimension(minWidth, minHeight);
    }

    max(dimension) {
        let maxWidth = (this.width > dimension.width) ? this.width : dimension.width;
        let maxHeight = (this.height > dimension.height) ? this.height : dimension.height;
        return new Dimension(minWidth, minHeight);
    }

    getSquare() {
        let size = Math.max(this.width, this.height);
        return new Dimension(size, size);
    }

    getArea() {
        return this.width * this.height;
    }

    clone() {
        let clone = new Dimension(this.x, this.y);
        clone.addLabel(this.label);
        return clone;
    }
    
}

class Point {
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }

    distance([point]) {
        return Math.sqrt(((this.x - point.x)*(this.x - point.x)) +
                         ((this.y - point.y)*(this.y - point.y)));
    }

    magnitude(){
        return this.distance(new Point(0,0));
    }

    translate(point, type) {
        if (type === translate.ADD || type === null) {
            this.x += point.x;
            this.y += point.y;
        } 
        else if (type === translate.SUBTRACT) {
            this.x -= point.x;
            this.y -= point.y;
        }
    }

    scale(scalar) {
        this.x *= scalar; 
        this.y *= scalar;
    }

    middle(point) {
        this.translate(point, translate.ADD).scale(0.5);
    }

    /**
     * Return a point with unit magnitude.
     */
    normalize(){
        this.scale(1.0/this.magnitude());
    }

    update(point){
        this.x = point.x;
        this.y = point.y;
    }

    /**
     * Find the nearest neighbor and the penality
     * for not choosing the nearest neighbor.
     */
    nearest(neighbors){
        if(neighbors.length === 0){
            throw "no neighbors";
        } else if (neighbors.length === 1){
            let neighbor = neighbors[0];
            return { nearest : neighbor,
                     penalty : 0,
                     distance : this.distance(neighbor) };
        } else {
            let neighbor = neighbors[0];
            let r = this.nearest(neighbors.slice(1));
            let distance = this.distance(neighbor);
            if(distance < r.distance){
                return { nearest : neighbor,
                    penalty : r.distance - distance,
                    distance : distance };
            } else { 
                return r; 
            }
        }
    }
    
    /* counter clockwise rotation*/
    r90(){
        this.update(new Point(-1.0 * this.y,this.x));
    }
    
    r180(){
        this.update(new Point(-1.0 * this.x,-1.0*this.y));
    }
    
    r270(){
        this.update(new Point(this.y,-1.0*this.x));
    }
}

class D3Object {
    constructor(label) {
        this.label = label;
        this.absolute = new Point(0, 0);
        this.relative = new Point(0, 0);
        this.dimension = new Dimension(0, 0);
        this.contentDimension = new Dimension(0, 0);
    }
    
    anchor(point) {
        this.dimension = this.dimension
            .toPoint()
            .scale(-0.5)
            .translate(point);
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
    }
    
    listLinks() {
        return this.links;
    }

    getAgent() {
        return this.agent;
    }
}

class Node extends D3Object {
    constructor (nodeData) {
        super(nodeData.site_node_name);
        this.sites = nodeData.site_node_sites.map(function(siteData) {
            return Site(siteData, this);
        });
    }
    
    listSites() {
        return this.sites;
    }

    getSite() {
        return this.listSites()[siteLabe];
    }

    preferredSize() {
        let d = this.listSites()
                    .reduce(function(acc,site)
                    {
                        return acc.add(site.getDimension());
                    },
                    this.contentDimension.scale(1.0));
        return this.contentDimension.scale(2.0).max(d);
    }   
}

class Links {

}