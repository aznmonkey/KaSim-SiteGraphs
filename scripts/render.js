/*jshint esversion: 6*/

class Layout {

    constructor(contactMap, dimension, margin) {
        this.contactMap = contactMap;
        this.dimension = dimension;
        this.margin = margin ||
            { top: 10, right: 10,
            bottom: 10, left: 10 };
        
    }
    /*    
    circleNodes(){
        let w = this.dimension.width;
        let h = this.dimension.height;
        let nodes = contactMap.data.listNodes();
    
        console.log(this.dimension);
        nodes.forEach(function(node,index,nodes){
            let dx = 0;
            let dy = 0;
            let length = nodes.length;

            if(length > 1){
                let angle = 2*index*Math.PI/length;
                dx = w * Math.cos(angle)/4;
                dy = h * Math.sin(angle)/3;
                console.log('x:' + dx + ' y:' + dy);
            }
            nodes[index].absolute = new Point(dx + w/2,
                                              dy + h/2);

            //set static node dimensions for now
            nodes[index].dimension = new Dimension(50,50);
    
      });
    }

 

    setNodeDimensions(node,dimensions){
        console.log(dimensions);
        node.contentDimension = new Dimension(dimensions.width, dimensions.height);
    }

    setSiteDimension(site,dimensions){
        site.contentDimension = dimensions.clone();
    }
*/
}


class ContactMap {
    constructor(id, isSnapShot) {
        this.id = '#'+id;
        this.isSnapShot = isSnapShot; 
    }
    setData(json) {
        
        let map = this;
        let parser = new Parser();
        /* populates the data */
        parser.readJson(json).then( function(response) {
            //console.log(response);
            map.data = response;
            let margin = { top: 10, right: 10,
            bottom: 10, left: 10 };
            let w = window.innerWidth - margin.left - margin.right;
            let h = window.innerHeight - margin.top - margin.bottom;
            if (response) {
                let layout = new Layout(map, new Dimension(w, h), margin);
                let renderer = new Render(map.id, layout);
                map.clearData();
                renderer.generateLinks();
                renderer.render();
            }
            else {
                Error('no data');
            }
            
        });
        
    }

    clearData() {
        d3.select(this.id).selectAll('svg').remove();
        d3.selectAll('.contact-tooltip').remove();
    }

}


class Render {
    constructor(id, layout) {
        this.root = d3.select('body');
        let width = layout.dimension.width;
        let height = layout.dimension.height;
        this.layout = layout;
        //console.log(layout);
        /* create svg to draw contact maps on */

        let container = this.root
            .append('svg')
            .attr('class', 'svg-group')
            .attr('id', 'map-container')
            .attr('width', width +
                            this.layout.margin.left +
                            this.layout.margin.right)
            .attr('height', height +
                            this.layout.margin.top +
                            this.layout.margin.bottom);

        this.svg = container.append('g')
                .attr('transform', 'translate(' + [width/2, height/2] + ')')
                .append('g');

        container.call(d3.zoom().on('zoom', () => this.svg.attr('transform', d3.event.transform)));
        container.call(d3.drag().on('drag', () => this.svg.attr('transform', 'translate(' + d3.event.x + ',' + d3.event.y +')')));

        this.agentNames = layout.contactMap.data
                              .listNodes()
                              .map(function(node){
                                return node.label;
                              });
                        
        this.siteList = [];
        let data = this.layout.contactMap.data;
        
        this.hierarchy = data.constructHierarchy();

        //console.log(this.hierarchy);
        // console.log(data);
        for (let key in data.listNodes()) { 
            let sites = data.listNodes()[key].listSites();
            for (let key in sites) {
                this.siteList.push(sites[key]);
            }
        }        
    }

    render() {
        // recalculate radius / dimensions
        let width = this.layout.dimension.width;
        let height = this.layout.dimension.height;
        let margin = 120;
        this.radius = Math.min(width, height)/2 - margin;
        this.arcHeight = this.radius / 4;

        // render chart
        console.log('rendering');
        this.renderDonut();
        // this.renderLinks();
    }

    generateLinks() {
        let data = this.layout.contactMap.data;
        this.siteLinks = [];

        for (let sites in this.siteList) {
            let siteList = this.siteList;
            let links = siteList[sites].listLinks();
            //console.log(links);
            for (let link in links) {
                //console.log(data.getNode(links[link].nodeId).getSite(links[link].siteId));
                //console.log(siteList[sites]);
                let target = data.getSite(links[link].nodeId, links[link].siteId);
                let source = siteList[sites];
                //console.log(target);
                let linkEdge = {target: target, source: source};
                //linkEdge.addData(target, source);
                this.siteLinks.push(linkEdge);
            }
        }
    }

    renderLinks() {
        let data = this.layout.contactMap.data;

        let svg = this.svg;
        let hierarchy = this.hierarchy;

        let cluster =  d3.cluster()
            .separation(function(a, b) { return 1; })
            .size([360, this.innerRadius]);

        let line = d3.radialLine()
            .curve(d3.curveBundle.beta(0.85))
            .radius(function(d) { return d.y; })
            .angle(function(d) { return d.x / 180 * Math.PI; });

        cluster(hierarchy);

        console.log('leaves',data.packageLinks(hierarchy.leaves()));
        let links = svg.selectAll('.links')
            .data(data.packageLinks(hierarchy.leaves()))
            .enter().append('path')
            .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
            .attr('class', 'link')
            .attr('d', line)
            .attr('stroke', 'steelblue')
            .attr('stroke-opacity', 0.4);;

    }

    renderDonut() {
        let c20 = d3.scaleOrdinal(d3.schemeCategory20c);
                    
        let pie = d3.pie() 
                    .sort(null)
                    .value((d) => d.listSites().length)
                    .padAngle(0.01);

        let nodes = this.layout.contactMap.data.listNodes();

        let arc = this.svg.selectAll('.arc')
            .data(pie(nodes))
        .enter().append('g')
            .attr('class','arc');

        let arcPath = d3.arc()
            .outerRadius(this.radius)
            .innerRadius(this.innerRadius);

        arc.append('path')
            .attr('d', arcPath)
            .attr('id', (d,i) => 'arc_' + i)
            .style('fill', (d,i) => c20(i));

        arc.append('text')
            .attr('transform', function(d) { //set the label's origin to the center of the arc
                return 'translate(' + arcPath.centroid(d) + ')';
            })
            .attr('text-anchor', 'middle')
            .style('fill', 'black')
            .text((d) => {
                let label = d.data.label;
                label = label.length > 10 ? label.substring(0,8): label;
                return label;
            });        

        this.svg.selectAll('.arc').each((d, i, el) => {
            d.data.arc = d;
            d.data.svg = el[i];
        })

        function getRotation(site) {
            let numSites = site.agent.sites.length;
            let index = site.agent.sites.indexOf(site);

            // interpolate between startangle and endangle
            let angle = site.agent.arc.startAngle + (site.agent.arc.endAngle - site.agent.arc.startAngle) * (index + 2) / (numSites + 3);
            return angle * 180 / Math.PI - 90;
        }

        let site = this.svg.selectAll('.site')
            .data(this.siteList)
        .enter().append('g')
            .attr('class','site')
            .attr('transform', d => {
                d.startAngle = getRotation(d);
                return 'rotate(' + d.startAngle + ')';
            });

        site.append('line')
            .attr('opacity', 0.5)
            .attr('stroke','white')
            .attr('stroke-dasharray', [2,2])
            .attr('x1', this.innerRadius)
            .attr('x2', this.radius);

        site.append('circle')
            .attr('cx', this.innerRadius)
            .attr('r', 1);

        site.append('text')
            .text(d => d.label)
            .attr('x', d => d.startAngle > 90 ? -this.radius : this.radius)
            .attr('y', 4)
            .attr('transform', d => d.startAngle > 90 ? 'rotate(180)' : null)
            .attr('text-anchor', d => d.startAngle > 90 ? 'end' : 'start');
    }

    get innerRadius() {
        return this.radius - this.arcHeight;
    }
}